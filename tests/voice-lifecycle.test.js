import { test } from 'node:test';
import assert from 'node:assert/strict';

const doc = new EventTarget();
doc.visibilityState = 'visible';
globalThis.document = doc;
globalThis.addEventListener = () => {};
const media = { getUserMedia: null };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: media, onLine: true } });
class Recorder {
  static isTypeSupported() { return true; }
  constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
  start() { this.state = 'recording'; }
  requestData() {}
  stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
}
globalThis.MediaRecorder = Recorder;
const mic = await import('../js/voice.js');
const stream = () => { const track = { stopped: false, stop() { this.stopped = true; } }; return { track, getTracks: () => [track] }; };

test('a late permission grant after backgrounding releases the stream without recording', async () => {
  let grant;
  media.getUserMedia = () => new Promise(r => { grant = r; });
  const pending = mic.start();
  doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
  const s = stream(); grant(s);
  await assert.rejects(pending, e => e.code === 'cancelled');
  assert.equal(s.track.stopped, true);
  assert.equal(mic.isRecording(), false);
  doc.visibilityState = 'visible';
});

test('an obsolete permission grant cannot replace a newer recording', async () => {
  let grant;
  media.getUserMedia = () => new Promise(r => { grant = r; });
  const old = mic.start(); mic.cancel();
  const live = stream(); media.getUserMedia = async () => live;
  await mic.start();
  const stale = stream(); grant(stale);
  await assert.rejects(old, e => e.code === 'cancelled');
  assert.equal(stale.track.stopped, true);
  assert.equal(live.track.stopped, false);
  assert.equal(mic.isRecording(), true);
  mic.cancel();
});

test('recorder setup failure releases the microphone and allows retry', async () => {
  const s = stream(); media.getUserMedia = async () => s;
  globalThis.MediaRecorder = class extends Recorder { start() { throw Error('device busy'); } };
  await assert.rejects(mic.start(), e => e.code === 'busy');
  assert.equal(s.track.stopped, true);
  assert.equal(mic.isOpening(), false);
  globalThis.MediaRecorder = Recorder;
  const next = stream(); media.getUserMedia = async () => next;
  await mic.start(); await mic.stop();
  assert.equal(next.track.stopped, true);
});

test('cancelled transcription never uploads or retries', async () => {
  const { transcribe } = await import('../js/stt.js');
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (_, { signal }) => { calls++; return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))); };
  try {
    const c = new AbortController();
    const p = transcribe(new Blob(['speech']), { key: 'test-only', model: 'test', signal: c.signal });
    c.abort();
    await assert.rejects(p, e => e.code === 'aborted');
    assert.equal(calls, 1);
    await assert.rejects(transcribe(new Blob(), { key: 'test-only', signal: c.signal }), e => e.code === 'aborted');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
