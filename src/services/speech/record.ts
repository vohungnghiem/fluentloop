/** Recording the microphone (MediaRecorder), for the benchmark and the talks. Audio stays on the device (and its sync). */

export type RecordError = 'unsupported' | 'blocked' | 'no-mic' | 'error';

export interface Recording {
  /** The audio, how long it was, and the loudness every 0.1 s (empty when the browser cannot measure it). */
  stop(): Promise<{ blob: Blob; seconds: number; levels: number[] }>;
  cancel(): void;
}

export const recordSupported = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

/** Loudness (RMS) of the microphone every 100 ms, for pauses; nothing when there is no Web Audio. */
function measure(stream: MediaStream, onLevel?: (level: number) => void): { levels: number[]; close(): void } {
  const levels: number[] = [];
  try {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (const sample of buffer) sum += sample * sample;
      const level = Math.sqrt(sum / buffer.length);
      levels.push(level);
      onLevel?.(level);
    }, 100);
    return { levels, close: () => { clearInterval(timer); void context.close(); } };
  } catch {
    return { levels, close: () => {} };
  }
}

export async function startRecording(onLevel?: (level: number) => void): Promise<Recording | RecordError> {
  if (!recordSupported()) return 'unsupported';
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = (error as DOMException)?.name;
    return name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : name === 'NotFoundError' ? 'no-mic' : 'error';
  }
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  const started = Date.now();
  const meter = measure(stream, onLevel);
  recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
  recorder.start();
  const release = () => {
    meter.close();
    stream.getTracks().forEach((track) => track.stop());
  };
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release();
          resolve({ blob: new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), seconds: Math.round((Date.now() - started) / 1000), levels: meter.levels });
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = release;
      if (recorder.state !== 'inactive') recorder.stop();
      else release();
    },
  };
}
