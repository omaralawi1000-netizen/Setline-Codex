import * as mic from '../js/voice.js';
import * as tts from '../js/tts.js';
import { transcribe, buildPrompt } from '../js/stt.js';
import { unlockAudio } from '../js/audio.js';
import { getKey } from '../js/keys.js';
import { sttModelId, ttsModelId, ttsAlt } from '../js/settings.js';
import { state } from './engine.js';

// One lifecycle owner for both recognition paths. Late results never outlive cancel().
export function createVoice({ onState, onText, onInterim, onError, onLevel }) {
  let seq = 0, phase = 'idle', rec = null, controller = null, raf = 0, maxTimer = 0;
  const set = s => { phase = s; onState(s); };
  const cancel = () => {
    seq++; controller?.abort(); controller = null;
    if (rec) { rec.onend = rec.onerror = rec.onresult = rec.onstart = null; rec.abort(); rec = null; }
    mic.cancel(); cancelAnimationFrame(raf); clearTimeout(maxTimer); tts.stop(); set('idle');
  };
  async function start() {
    cancel(); const mine = seq; unlockAudio(); set('opening');
    try {
      if (getKey('groq')) {
        await mic.start({ maxMs: 60000, onMaxed: () => stop(), onInterrupted: () => { cancel(); onError('interrupted'); } });
        if (mine !== seq) return;
        set('recording');
        const frame = () => { if (phase !== 'recording' || mine !== seq) return; onLevel(mic.level()); raf = requestAnimationFrame(frame); }; frame();
      } else {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) throw Object.assign(new Error(), { code: 'setup' });
        rec = new Recognition(); rec.lang = state.settings.voiceLang === 'da' || (state.settings.voiceLang === 'auto' && state.lang === 'da') ? 'da-DK' : 'en-US';
        rec.continuous = false; rec.interimResults = true;
        let final = '', interim = '';
        rec.onstart = () => { if (mine === seq) { clearTimeout(maxTimer); set('recording'); maxTimer = setTimeout(() => stop(), 60000); } };
        rec.onresult = event => {
          if (mine !== seq) return;
          final = ''; interim = '';
          for (const r of event.results) { if (r.isFinal) final += r[0].transcript + ' '; else interim += r[0].transcript; }
          onInterim((final + interim).trim());
        };
        rec.onerror = event => { if (mine !== seq) return; cancel(); onError(event.error); };
        rec.onend = () => { if (mine !== seq) return; clearTimeout(maxTimer); rec = null; set('idle'); final.trim() ? onText(final.trim()) : onError('no-speech'); };
        rec.start(); maxTimer = setTimeout(() => { if (mine === seq && phase === 'opening') { cancel(); onError('timeout'); } }, 10000);
      }
    } catch (e) { if (mine !== seq) return; cancel(); onError(e.code || e.name || 'failed'); }
  }
  async function stop() {
    const mine = seq;
    if (phase === 'opening') { cancel(); return; }
    if (rec) { set('thinking'); rec.stop(); clearTimeout(maxTimer); maxTimer = setTimeout(() => { if (mine === seq && rec) { cancel(); onError('no-speech'); } }, 6000); return; }
    if (!mic.isRecording()) return;
    cancelAnimationFrame(raf); set('thinking');
    const audio = await mic.stop();
    if (mine !== seq) return;
    if (!audio || audio.ms < 300 || audio.blob.size < 400) { set('idle'); onError('no-speech'); return; }
    controller = new AbortController();
    try {
      const ex = state.active?.exercises[state.active.current];
      const text = await transcribe(audio.blob, { key: getKey('groq'), model: sttModelId(state.settings), language: state.settings.voiceLang, lang: state.settings.voiceLang, prompt: buildPrompt({ current: ex?.exerciseId, recent: Object.keys(state.usage).slice(0, 5), catalog: state.catalog }), signal: controller.signal });
      if (mine !== seq) return;
      controller = null; set('idle'); text ? onText(text) : onError('no-speech');
    } catch (e) { if (mine !== seq) return; set('idle'); onError(e.code || 'failed'); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  addEventListener('pagehide', cancel);
  return { start, stop, cancel, get phase() { return phase; } };
}
export function speak(text) {
  if (!text || state.settings.spoken === 'off' || document.hidden) return;
  tts.speak(text, { key: getKey('google'), model: ttsModelId(state.settings), alt: ttsAlt(state.settings), voice: state.settings.voice, lang: state.lang, canSpeak: () => !document.hidden && !mic.isRecording() && !mic.isOpening() });
}
