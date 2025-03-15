export interface Segment {
  id: string;
  text: string;
}

export interface TTSResult {
  audio: string;
  srt: string;
}

export interface TTSParams {
  name: string;
  text: string;
  voice: string;
  rate: string;
  pitch: string;
  speed: string;
  output: string;
}
