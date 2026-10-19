import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import {
  alignCueText,
  cuesToSrt,
  formatSrtTime,
  groupCues,
  mergeSegmentSubtitles,
  mergeSubtitleFiles,
  parseSegmentSubtitle,
  ticksToMs,
  toSegmentDoc,
  SubtitleItem,
} from '../src/utils/subtitle'
import { Mp3FrameCounter, mp3DurationMs, parseFrameHeader } from '../src/utils/mp3'
import { buildSrtFromSegments, segmentSubtitlePath } from '../src/services/subtitle.service'

/** MPEG-2 Layer III, 24 kHz, 96 kbps, mono — exactly what Edge sends. 288 B / 576 samples (24 ms). */
function edgeFrames(n: number): Buffer {
  const frame = Buffer.alloc(288)
  frame[0] = 0xff
  frame[1] = 0xf3
  frame[2] = 0xa4
  frame[3] = 0xc0
  return Buffer.concat(Array.from({ length: n }, () => frame))
}

/** Simulate one Edge segment: words spoken, then trailing silence (Edge adds ~0.9 s). */
function fakeSegment(words: number, trailingMs: number) {
  const cues: SubtitleItem[] = []
  let t = 100 // leading silence, already included in Edge offsets
  for (let i = 0; i < words; i++) {
    cues.push({ part: `w${i}`, start: t, end: t + 250 })
    t += 300
  }
  return { cues, durationMs: cues[cues.length - 1].end + trailingMs }
}

describe('mp3 frame counter', () => {
  test('parses Edge frame header', () => {
    expect(parseFrameHeader(edgeFrames(1), 0)).toEqual({ length: 288, samples: 576, sampleRate: 24000 })
  })
  test('duration is frame-accurate, chunk-boundary independent', () => {
    const buf = edgeFrames(1000) // 24 s
    expect(mp3DurationMs(buf)).toBe(24000)
    const c = new Mp3FrameCounter()
    for (let i = 0; i < buf.length; i += 97) c.push(buf.subarray(i, i + 97))
    expect(c.frames).toBe(1000)
    expect(c.durationMs).toBe(24000)
  })
  test('skips ID3v2 tag and resyncs over garbage', () => {
    const id3 = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 10, ...Array(10).fill(0)])
    expect(mp3DurationMs(Buffer.concat([id3, Buffer.from([1, 2, 3]), edgeFrames(50)]))).toBe(1200)
  })
})

describe('subtitle time model', () => {
  test('100-ns ticks -> ms with rounding', () => {
    expect(ticksToMs(1_000_000)).toBe(100)
    expect(ticksToMs(8_749_999)).toBe(875)
  })

  test('REGRESSION: offsets use real segment durations, not last cue end', () => {
    const segs = Array.from({ length: 7 }, () => fakeSegment(300, 890))
    // ground truth: segment k starts at sum of previous real durations
    let truth = 0
    const truthFirstCue: number[] = []
    for (const s of segs) {
      truthFirstCue.push(truth + s.cues[0].start)
      truth += s.durationMs
    }
    const merged = mergeSegmentSubtitles(segs)
    let i = 0
    segs.forEach((s, k) => {
      expect(merged.cues[i].start).toBe(truthFirstCue[k])
      i += s.cues.length
    })
    expect(merged.durationMs).toBe(truth)

    // the legacy algorithm drifts by trailing silence per boundary (6 * 890 ms here)
    const legacy = mergeSubtitleFiles(segs.map((s) => s.cues))
    const lastFirst = legacy.length - segs[6].cues.length
    expect(truthFirstCue[6] - legacy[lastFirst].start).toBe(6 * 890)
  })

  test('legacy array docs still merge (fallback to last cue end)', () => {
    const a = [{ part: 'a', start: 0, end: 1000 }]
    const b = [{ part: 'b', start: 0, end: 500 }]
    expect(mergeSegmentSubtitles([parseSegmentSubtitle(a), parseSegmentSubtitle(b)]).cues[1].start).toBe(1000)
    expect(parseSegmentSubtitle(toSegmentDoc(a, 1234.4)).durationMs).toBe(1234)
  })

  test('SRT: rounded integer ms, one text line per block, no stray blank lines', () => {
    expect(formatSrtTime(3723004.6)).toBe('01:02:03,005')
    const srt = cuesToSrt([
      { part: '今天\n', start: 0, end: 100.4 },
      { part: 'Hi\r\n\nthere', start: 200, end: 200 },
    ])
    const blocks = srt.trim().split(/\n\n/)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toBe('1\n00:00:00,000 --> 00:00:00,100\n今天')
    expect(blocks[1]).toBe('2\n00:00:00,200 --> 00:00:00,201\nHi there')
  })

  test('groupCues builds sentence-level lines from word cues', () => {
    const words: SubtitleItem[] = [
      { part: '我', start: 0, end: 100 },
      { part: '不见他，', start: 100, end: 400 },
      { part: '已是', start: 500, end: 700 },
      { part: '三十多年；', start: 700, end: 1200 },
      { part: '今天', start: 1500, end: 1700 },
      { part: '见了。', start: 1700, end: 2000 },
    ]
    const g = groupCues(words, { softChars: 4 })
    expect(g.map((c) => c.part)).toEqual(['我不见他，', '已是三十多年；', '今天见了。'])
    expect(g[1]).toMatchObject({ start: 500, end: 1200 })
    const en = groupCues([
      { part: 'Alice', start: 0, end: 300 },
      { part: 'was', start: 300, end: 500 },
      { part: 'tired.', start: 500, end: 900 },
    ])
    expect(en[0].part).toBe('Alice was tired.')
  })

  test('alignCueText restores punctuation, collapses newlines, opener goes to next cue', () => {
    const text = '我想：\n『你告诉我！』他们可就跑了。'
    const cues = ['我', '想', '你', '告诉', '我', '他们', '可', '就', '跑', '了'].map((part, i) => ({
      part,
      start: i * 100,
      end: i * 100 + 90,
    }))
    const out = alignCueText(text, cues).map((c) => c.part)
    expect(out.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''))
    expect(out[1]).toBe('想： ')
    expect(out[2]).toBe('『你')
    expect(out.some((p) => p.includes('\n'))).toBe(false)
  })

  test('alignCueText does not duplicate text when a token cannot be aligned', () => {
    const out = alignCueText('二零二六年到了。', [
      { part: '2026', start: 0, end: 100 },
      { part: '年', start: 100, end: 200 },
    ]).map((c) => c.part)
    expect(out[0]).toBe('2026')
    expect(out.join('')).not.toMatch(/年.*年/)
  })
})

describe('buildSrtFromSegments', () => {
  test('uses the given order (not readdir/name order) and real durations', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srt-'))
    const s0 = toSegmentDoc([{ part: '第一句。', start: 100, end: 900 }], 1800)
    const s1 = toSegmentDoc([{ part: '第二句。', start: 120, end: 700 }], 1500)
    // write index 1 first and with a name that sorts before index 0 lexicographically
    await fs.writeFile(segmentSubtitlePath(dir, 1), JSON.stringify(s1))
    await fs.writeFile(segmentSubtitlePath(dir, 0), JSON.stringify(s0))
    const srtPath = path.join(dir, 'out.srt')
    const r = await buildSrtFromSegments(
      [{ json: segmentSubtitlePath(dir, 0) }, { json: segmentSubtitlePath(dir, 1) }],
      srtPath
    )
    expect(r.durationMs).toBe(3300)
    const srt = await fs.readFile(srtPath, 'utf8')
    expect(srt).toContain('00:00:01,920 --> 00:00:02,500\n第二句。')
    await fs.rm(dir, { recursive: true, force: true })
  })

  test('legacy json without duration is measured from its mp3', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srt-'))
    const a = path.join(dir, '1_splits.mp3')
    await fs.writeFile(a, edgeFrames(100)) // 2400 ms
    await fs.writeFile(`${a}.json`, JSON.stringify([{ part: 'A。', start: 100, end: 1500 }]))
    const b = path.join(dir, '2_splits.mp3')
    await fs.writeFile(b, edgeFrames(50))
    await fs.writeFile(`${b}.json`, JSON.stringify([{ part: 'B。', start: 100, end: 900 }]))
    const srtPath = path.join(dir, 'o.srt')
    const r = await buildSrtFromSegments(
      [a, b].map((audio) => ({ audio, json: `${audio}.json` })),
      srtPath
    )
    expect(r.durationMs).toBe(3600)
    expect(await fs.readFile(srtPath, 'utf8')).toContain('00:00:02,500 --> 00:00:03,300\nB。')
    await fs.rm(dir, { recursive: true, force: true })
  })
})

describe('groupCues punctuation with closing quotes', () => {
  test('a quote-closed sentence ends the line', () => {
    const g = groupCues([
      { part: '"Captain,', start: 0, end: 300 },
      { part: 'deck three!"', start: 300, end: 900 },
      { part: 'shouted', start: 1000, end: 1300 },
      { part: 'Emma.', start: 1300, end: 1600 },
    ])
    expect(g.map((c) => c.part)).toEqual(['"Captain, deck three!"', 'shouted Emma.'])
    const z = groupCues([
      { part: '“别急，', start: 0, end: 300 },
      { part: '我煮了姜汤。”', start: 300, end: 900 },
      { part: '她说。', start: 1000, end: 1300 },
    ])
    expect(z.map((c) => c.part)).toEqual(['“别急，我煮了姜汤。”', '她说。'])
  })
})
