interface Segment {
  id: string
  text: string
}

interface TTSResult {
  audio: string
  srt: string
  partial?: boolean
  /** user-facing note, e.g. AI casting fell back to the default voice */
  warning?: string
}

interface TTSParams {
  text: string
  voice: string
  volume: string
  rate: string
  pitch: string
  output: string
}
type BuildSegment = TTSParams & {
  text: string
}
