// Listen until you're done: the mic, the smart pause and speech-to-text in one call.
// A pause sends only when what you said sounds finished; half sentences wait (up to waitMs of quiet).
// Returns { done: Promise<string>, stop(), cancel() }; stop() sends now, cancel() gives ''.
import * as mic from '../voice.js';
import { transcribe } from '../stt.js';
import { createEndpointer, looksUnfinished } from '../endpoint.js';

export function listenSmart({ stt, onLevel = () => {}, onState = () => {}, pauseMs = 900, waitMs = 3500, maxMs = 90_000 } = {}) {
  const ep = createEndpointer({ pauseMs });
  const controller = new AbortController();
  let resolve, reject, over = false, settled = false, raf = 0, last = 0, spec = null, waiting = false;
  const done = new Promise((res, rej) => { resolve = res; reject = rej; });
  const end = fn => {
    if (settled) return false;
    settled = over = true; controller.abort(); spec?.controller.abort(); cancelAnimationFrame(raf); onLevel(0);
    document.removeEventListener('visibilitychange', hidden); removeEventListener('pagehide', cancel);
    fn(); return true;
  };
  const cancel = () => end(() => { mic.cancel(); resolve(''); });
  const hidden = () => { if (document.visibilityState === 'hidden') cancel(); };
  document.addEventListener('visibilitychange', hidden);
  addEventListener('pagehide', cancel);

  async function finish() {
    if (over) return;
    over = true; cancelAnimationFrame(raf); onLevel(0);
    spec?.controller.abort(); spec = null;
    onState('hearing');
    const r = await mic.stop();
    if (settled) return;
    if (!r || r.ms < 500 || (r.measured && r.peak < 0.03)) return end(() => resolve(''));
    try { const text = await transcribe(r.blob, { ...stt, signal: controller.signal }); end(() => resolve(text)); } catch (e) { end(() => reject(e)); }
  }
  async function speculate() {
    const blob = mic.snapshot();
    if (!blob || blob.size < 800) return;
    spec?.controller.abort();
    const mine = spec = { controller: new AbortController() };
    onState('check');
    let text;
    try { text = await transcribe(blob, { ...stt, signal: mine.controller.signal }); } catch { if (spec === mine && !over) { spec = null; waiting = true; onState('listening'); } return; }
    if (spec !== mine || over) return;
    spec = null;
    if (looksUnfinished(text)) { waiting = true; onState('wait'); return; }
    end(() => { mic.cancel(); resolve(text); });
  }
  const tick = now => {
    if (over) return;
    const l = mic.level();
    onLevel(l);
    const ev = last ? ep.push(l, now - last) : null;
    last = now;
    if (ev === 'pause') speculate();
    else if (ev === 'resume') { spec?.controller.abort(); spec = null; waiting = false; onState('listening'); }
    if (waiting && ep.quietMs >= waitMs) { waiting = false; finish(); return; }
    raf = requestAnimationFrame(tick);
  };

  mic.start({ maxMs, onMaxed: () => finish(), onInterrupted: () => end(() => reject(Object.assign(new Error('busy'), { code: 'busy' }))) }).then(() => {
    if (over) { mic.cancel(); return; }
    onState('listening');
    raf = requestAnimationFrame(tick);
  }, e => end(() => reject(e)));

  return {
    done,
    stop: () => finish(),
    cancel
  };
}
