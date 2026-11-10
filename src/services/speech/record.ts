/** Recording the microphone (MediaRecorder), for the speaking benchmark. Audio stays on the device. */

export type RecordError = 'unsupported' | 'blocked' | 'no-mic' | 'error';

export interface Recording {
  stop(): Promise<{ blob: Blob; seconds: number }>;
  cancel(): void;
}

export const recordSupported = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export async function startRecording(): Promise<Recording | RecordError> {
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
  recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
  recorder.start();
  const release = () => stream.getTracks().forEach((track) => track.stop());
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release();
          resolve({ blob: new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), seconds: Math.round((Date.now() - started) / 1000) });
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
