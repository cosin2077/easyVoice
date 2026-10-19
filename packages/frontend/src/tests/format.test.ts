import { test, expect } from 'vitest'
import { friendlyVoiceName, friendlyDownloadLabel, formatTime } from '@/utils/format'
import { mapZHVoiceName } from '@/utils'
import { Mp3DurationCounter } from '@/utils/mp3'

test('voice labels share one format across languages', () => {
  expect(friendlyVoiceName('zh-CN-XiaoxiaoNeural', 'Female', mapZHVoiceName('zh-CN-XiaoxiaoNeural'))).toBe('晓晓 · 女')
  expect(friendlyVoiceName('ja-JP-NanamiNeural', 'Female')).toBe('Nanami · 女')
  expect(friendlyVoiceName('en-US-AndrewMultilingualNeural', 'Male')).toBe('Andrew · 男 · 多语')
})

test('download label: voice + snippet, no timestamp', () => {
  const l = friendlyDownloadLabel('zh-CN-YunxiNeural-我不见他，已是三十多-1792450424840.mp3')
  expect(l).toBe('云希 · 我不见他，已是三十多')
  expect(friendlyDownloadLabel('aigen--The-storm--1792451434319.mp3', 'Alice was beginning to get very tired')).toBe(
    'AI 配音 · Alice was beginning to get…'
  )
})

test('formatTime never shows Infinity/NaN', () => {
  expect(formatTime(Infinity)).toBe('0:00')
  expect(formatTime(NaN)).toBe('0:00')
  expect(formatTime(185.2)).toBe('3:05')
})

test('stream duration from MP3 frames (Edge 24kHz/96kbps)', () => {
  const frame = new Uint8Array(288)
  frame.set([0xff, 0xf3, 0xa4, 0xc0])
  const c = new Mp3DurationCounter()
  const all = new Uint8Array(288 * 250)
  for (let i = 0; i < 250; i++) all.set(frame, i * 288)
  for (let i = 0; i < all.length; i += 1000) c.push(all.subarray(i, i + 1000))
  expect(c.duration).toBeCloseTo(6, 5)
})
