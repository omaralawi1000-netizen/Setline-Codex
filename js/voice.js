// Microphone capture: MediaRecorder (webm/opus, mono) with a live level from a Web Audio analyser.
// The stream is released on stop, on cancel and whenever the page hides.
import { audioContext } from './audio.js';

export const MAX_MS = 60_000; // room to stop and think mid-sentence

let rec = null; // {stream, recorder, chunks, analyser, source, startedAt, peak, timer, resolve}
let generation = 0, opening = false;

export const isRecording = () => !!rec;
export const isOpening = () => opening;

function pickMime() {
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return opts.find(m => globalThis.MediaRecorder?.isTypeSupported?.(m)) || '';
}

// Start recording. Resolves once the mic is open. Throws {code:'denied'|'nomic'|'unsupported'|'busy'}.
export async function start({ onMaxed, onInterrupted, maxMs = MAX_MS } = {}) {
  if (rec || opening) throw Object.assign(new Error('busy'), { code: 'busy' });
  if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) throw Object.assign(new Error('unsupported'), { code: 'unsupported' });
  if (document.visibilityState === 'hidden') throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
  const ticket = ++generation;
  opening = true;
  let stream;
  try {
    // No echo cancellation: nothing plays while recording, and on Android it switches the phone into
    // call audio, which is slower to open, can clip the first word and pops the speaker on the way back.
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    if (ticket === generation) opening = false;
    const code = e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : e?.name === 'NotFoundError' ? 'nomic' : 'busy';
    throw Object.assign(new Error(code), { code });
  }
  if (ticket !== generation || document.visibilityState === 'hidden') {
    stream.getTracks().forEach(t => t.stop());
    if (ticket === generation) opening = false;
    throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
  }
  let r;
  try {
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
  r = { stream, recorder, chunks: [], analyser: null, source: null, startedAt: performance.now(), peak: 0, buf: null, timer: 0, frames: 0 };
  recorder.ondataavailable = e => { if (e.data?.size) r.chunks.push(e.data); };
  const interrupted = () => { if (rec !== r) return; cancel(); onInterrupted?.(); };
  recorder.onerror = interrupted;
  stream.getTracks().forEach(track => track.addEventListener?.('ended', interrupted, { once: true }));
  const ac = audioContext();
  if (ac) {
    try {
      r.source = ac.createMediaStreamSource(stream);
      r.analyser = ac.createAnalyser();
      r.analyser.fftSize = 1024;
      r.analyser.smoothingTimeConstant = 0.2;
      r.source.connect(r.analyser);
      r.buf = new Float32Array(r.analyser.fftSize);
      if (ac.state !== 'running') ac.resume().catch(() => {});
    } catch { r.analyser = null; }
  }
  recorder.start(250);
  r.timer = setTimeout(() => onMaxed?.(), maxMs);
  rec = r;
  } catch (e) {
    if (r) release(r); else stream.getTracks().forEach(t => t.stop());
    throw Object.assign(new Error('busy'), { code: 'busy' });
  } finally { if (ticket === generation) opening = false; }
}

// Current input level, 0..1 (RMS, shaped for display).
export function level() {
  if (!rec?.analyser) return 0;
  if (audioContext()?.state !== 'running') return 0; // not measuring; don't judge silence from this
  rec.frames++;
  rec.analyser.getFloatTimeDomainData(rec.buf);
  let sum = 0;
  for (let i = 0; i < rec.buf.length; i++) sum += rec.buf[i] * rec.buf[i];
  const rms = Math.sqrt(sum / rec.buf.length);
  const v = Math.min(1, Math.pow(rms * 6, 0.7));
  if (v > rec.peak) rec.peak = v;
  return v;
}

function release(r) {
  clearTimeout(r.timer);
  try { r.source?.disconnect(); } catch {}
  for (const tr of r.stream.getTracks()) tr.stop();
}

// Stop and return {blob, ms, peak}. The mic is closed before this resolves.
export function stop() {
  generation++;
  opening = false;
  const r = rec;
  rec = null;
  if (!r) return Promise.resolve(null);
  return new Promise(res => {
    let settled = false, timer;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      release(r);
      const type = r.recorder.mimeType || 'audio/webm';
      // measured: the level meter really ran, so a low peak means silence
      res({ blob: new Blob(r.chunks, { type }), ms: performance.now() - r.startedAt, peak: r.peak, measured: r.frames > 8 });
    };
    if (r.recorder.state === 'inactive') return done();
    r.recorder.onstop = done;
    r.recorder.onerror = done;
    try { r.recorder.requestData(); } catch {}
    timer = setTimeout(done, 1500);
    try { r.recorder.stop(); } catch { done(); }
    release(r);
  });
}

// What's been recorded so far, without stopping (for a quick look at a pause).
export function snapshot() {
  if (!rec?.chunks.length) return null;
  return new Blob(rec.chunks, { type: rec.recorder.mimeType || 'audio/webm' });
}

export function cancel() {
  generation++;
  opening = false;
  const r = rec;
  rec = null;
  if (!r) return;
  r.recorder.onstop = null;
  try { r.recorder.stop(); } catch {}
  release(r);
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cancel(); });
addEventListener('pagehide', cancel);
