interface Segment {
  id: string;
  text: string;
}

interface TTSResult {
  audio: string;
  file: string;
  srt: string;
}

interface TTSParams {
  text: string;
  voice: string;
  volume: string;
  rate: string;
  pitch: string;
  output: string;
}
