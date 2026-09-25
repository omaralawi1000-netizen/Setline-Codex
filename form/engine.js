// Presentation-independent bridge to Setline's tested workout and voice engine.
import * as store from '../js/store.js';
import * as W from '../js/workout.js';
import { parse } from '../js/parser.js';
import { resolve } from '../js/commands.js';
import { translator } from '../js/i18n.js';
import { aiCommand, aiPlan, withFallback, pickTextModels, streamChat } from '../js/ai.js';
import { listModels, pickTtsModel } from '../js/tts.js';
import { cmdModels, coachModels } from '../js/settings.js';
import { buildContext, chatContents, planSchema, planSystem, validatePlan } from '../js/coach.js';
import { getKey } from '../js/keys.js';
import { personalContext } from './personal.js';
export { store, W };
export const state = store.state;
export function suggested(ex) {
  const last=W.lastSession(state.history,ex.exerciseId), base=W.suggestNext(ex,last,state.catalog.get(ex.exerciseId)?.equipment==='bodyweight'?0:20);
  if(!ex.weightBasis||ex.sets.some(s=>s.done)||last)return base;
  return {kg:ex.draft?.kg??ex.sets.find(s=>s.kg!=null)?.kg??ex.weightHint??null,reps:ex.draft?.reps??ex.sets.find(s=>s.reps!=null)?.reps??null};
}
export function context() {
  const w = state.active, ex = w?.exercises[w.current];
  const last = ex ? W.lastDoneIndex(ex) : -1, planned = ex ? W.firstPlannedIndex(ex) : -1;
  return { lang: state.settings.voiceLang, unit: state.settings.unit, catalog: state.catalog, usage: state.usage, routines: state.routines, now: Date.now(), workoutExerciseIds: w?.exercises.map(e => e.exerciseId) || [],
    current: ex ? { exerciseId: ex.exerciseId, lastSet: ex.sets[last] || null, planned: ex.sets[planned] || null, shown: suggested(ex) } : null,
    restRunning: !!(w && W.restRemaining(w.rest)) };
}
export const signature = () => JSON.stringify([state.active, state.routines, state.undo.length, state.settings.unit]);
export const snapshot = () => ({ ...state, nameLang: state.lang, undoCount: state.undo.length, now: Date.now() });
export const interpret = text => parse(text, context());
export function command(intent) { return resolve(intent, snapshot(), translator(intent.lang || state.lang), intent.lang || state.lang); }
export async function execute(cmd) {
  const r = cmd.run;
  if (!r) return {};
  if (r.op === 'update') { store.update(w => r.fn(w, Date.now()), { undo: 'voice', reason: 'voice' }); await store.flush(); }
  else if (r.op === 'start') { store.startWorkout(r.template); await store.flush(); return { then: r.then }; }
  else if (r.op === 'undo') { store.undo(); await store.flush(); }
  else if (r.op === 'bodyweight') { await store.logBodyweight(r.kg); }
  else if (r.op === 'checkin') { await store.saveCheckin(r.patch); }
  else if (r.op === 'finish') return { finished: await store.finish() };
  else if (r.op === 'discard') { await store.discard(); return { discarded: true }; }
  else throw new Error('unsupported');
  return {};
}
let modelsReady = '';
export async function models(signal) {
  const key = getKey('google');
  if (!key || modelsReady === key) return;
  const result = await listModels(key);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (result.status !== 'ok') throw new Error(result.status);
  const m = pickTextModels(result.models);
  store.setSettings({ cmdModel: m.command || '', cmdAlt: m.commandAlt || '', coachModel: m.coach || '', coachAlt: m.coachAlt || '', ttsModel: pickTtsModel(result.models, null, 'natural') || '', ttsLite: pickTtsModel(result.models, null, 'fast') || '' });
  modelsReady = key;
}
export async function fallback(text, signal) {
  await models(signal);
  const end = performance.now() + 5000;
  return withFallback(cmdModels(state.settings), model => aiCommand(text, { ...context(), hasWorkout: !!state.active }, { key: getKey('google'), model, signal, timeout: Math.max(1, end - performance.now()) }), { maxWait: 0 });
}
export async function ask(question, signal, onText) {
  await models(signal);
  const history = state.chat.filter(m => !m.error && !m.streaming);
  // The inherited context's app guide is excluded: FORM exposes a focused feature set.
  const training = buildContext({ ...snapshot(), photoCount: 0, goals: [] }).split('\n').filter(line=>!line.startsWith('FOOD today:')&&!line.startsWith('PROTEIN today:')).join('\n');
  const full = personalContext(state.bodyweight) + '\n' + training;
  const system = `You are FORM, a thoughtful strength and nutrition training partner. Reply in ${state.lang === 'da' ? 'Danish' : 'English'}. Follow the user's latest personal coaching preferences. Use only recorded information; distinguish estimates and never invent results or calorie/macro targets. Consider lifting and wrestling together, prioritizing muscle retention, sustainable fat loss, recovery, satiety and performance. Evaluate food in the context of the whole day. Proactively flag patterns supported by multiple observations; distinguish uncertainty from a real stall. Keep replies concise unless asked for detail. FORM has workouts, routines, journal check-ins, settings and voice commands. Personal notes are edited in Settings; check-ins are in Journal. For pain or injury give general guidance and recommend qualified care. Do not claim to change data.`;
  const answer = await withFallback(coachModels(state.settings), model => streamChat({ key: getKey('google'), model, signal, system, contents: chatContents(history, full, question), onText }), { maxWait: 0 });
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  store.addChat('user', question); store.addChat('model', answer);
  return answer;
}
export async function generatePlan(question, signal) {
  await models(signal);
  const raw = await withFallback(coachModels(state.settings), model => aiPlan({ key: getKey('google'), model, signal, schema: planSchema(state.catalog), system: planSystem(state.lang, state.catalog), prompt: personalContext(state.bodyweight)+'\nREQUEST: '+question }), { maxWait: 0 });
  const plan = validatePlan(raw, state.catalog);
  if (!plan) throw new Error('invalid');
  return plan;
}
