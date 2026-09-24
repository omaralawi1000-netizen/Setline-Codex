// Bottom sheets. Each open sheet owns a history entry so Android back closes it.
import { $ } from './dom.js';

const stack = [];
const waiting = [];   // resolvers for history.back() calls we triggered

export const sheetOpen = () => stack.length > 0;

// render(body, api) fills the sheet. api = {close, replace}.
export function openSheet(render, { onClose = null, label = '' } = {}) {
  const app = $('#app');
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const el = document.createElement('div');
  el.className = 'sheet glass';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.tabIndex = -1;
  if (label) el.setAttribute('aria-label', label);
  app.append(scrim, el);
  const entry = { el, scrim, onClose, trigger: document.activeElement, blocked: [] };
  for (const node of app.children) {
    if (node === el || node === scrim || node.inert) continue;
    entry.blocked.push(node); node.inert = true;
  }
  stack.push(entry);
  history.pushState({ ...(history.state || {}), sheet: stack.length }, '');

  const api = {
    sheet: el,
    close: () => closeTop(),
    // swap contents without touching history (confirm chains)
    replace: (next, opts = {}) => { entry.onClose = opts.onClose ?? null; fill(next); }
  };
  // Each fill gets a fresh container, so listeners from the previous content go with it.
  function fill(fn) {
    el.innerHTML = '<div class="grab" aria-hidden="true"></div>';
    el.style.height = '';
    const box = document.createElement('div');
    box.className = 'sin';
    el.append(box);
    fn(box, api);
    const f = box.querySelector('[autofocus]') || el;
    requestAnimationFrame(() => { if (stack.at(-1) === entry) f.focus({ preventScroll: true }); });
  }
  fill(render);
  el.addEventListener('keydown', e => {
    if (stack.at(-1) !== entry) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTop(); return; }
    if (e.key !== 'Tab') return;
    const nodes = [...el.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(n => !n.disabled && n.tabIndex >= 0 && n.getClientRects().length && !n.closest('[inert]'));
    const first = nodes[0] || el, last = nodes.at(-1) || el;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === el)) { e.preventDefault(); first.focus(); }
  });
  scrim.addEventListener('click', () => closeTop());
  dragToClose(el, scrim, entry);
  requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('show'); el.classList.add('show'); }));
  return api;
}

// Pull the sheet down by its top edge to close it.
function dragToClose(el, scrim, entry) {
  let d = null;
  el.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('input,button,select,a,.sbody')) return;
    if (e.clientY - el.getBoundingClientRect().top > 72) return;
    d = { y: e.clientY, t: performance.now(), dy: 0, id: e.pointerId };
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
  });
  el.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    d.dy = Math.max(0, e.clientY - d.y);
    el.style.transform = `translateY(${d.dy}px)`;
    scrim.style.opacity = String(Math.max(0, 1 - d.dy / 400));
  });
  const end = () => {
    if (!d) return;
    const v = d.dy / Math.max(1, performance.now() - d.t);
    const close = d.dy > 110 || (v > 0.6 && d.dy > 30);
    d = null;
    el.classList.remove('dragging');
    el.style.transform = '';
    scrim.style.opacity = '';
    if (close && stack[stack.length - 1] === entry) closeTop();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function dismiss(entry) {
  entry.el.inert = true;
  entry.blocked.forEach(node => { if (node.isConnected) node.inert = false; });
  const focus = entry.trigger?.isConnected && !entry.trigger.closest('[inert]') ? entry.trigger : stack.at(-1)?.el;
  focus?.focus({ preventScroll: true });
  entry.el.classList.remove('show');
  entry.scrim.classList.remove('show');
  const kill = () => { entry.el.remove(); entry.scrim.remove(); };
  // only the sheet's own slide counts; a button's transition inside it would cut the slide short
  const onEnd = e => { if (e.target === entry.el && e.propertyName === 'transform') { entry.el.removeEventListener('transitionend', onEnd); kill(); } };
  entry.el.addEventListener('transitionend', onEnd);
  setTimeout(kill, 600);
  entry.onClose?.();
}

// Close the top sheet from the UI. Resolves once history has settled.
export function closeTop() {
  const entry = stack.pop();
  if (!entry) return Promise.resolve();
  dismiss(entry);
  if (!history.state?.sheet) return Promise.resolve(); // never step back past our own entry
  return new Promise(res => { waiting.push(res); history.back(); });
}

export async function closeAll() {
  while (stack.length) await closeTop();
}

// Call from popstate. Returns true if a sheet consumed the event.
export function handlePop() {
  if (waiting.length) { waiting.shift()(); return true; }
  const entry = stack.pop();
  if (entry) { dismiss(entry); return true; }
  return false;
}
