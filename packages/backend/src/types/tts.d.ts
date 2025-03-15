interface Segment {
  id: string;
  text: string;
}

interface TTSResult {
  audio: string;
  srt: string;
}

interface TTSParams {
  name: string;
  text: string;
  voice: string;
  rate: string;
  pitch: string;
  speed: string;
  output: string;
}
