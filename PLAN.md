# FORM — current checkpoint

Status: refinement ready. FORM 2.1.0 contains the Coach/navigation refinement and requires the next GitHub Pages deployment. FORM 2.0.0 is the last verified live release at https://omaralawi1000-netizen.github.io/Setline-Codex/. New build plan: form/PLAN.md. Previous plans: docs/SETLINE-PLAN.md. Prior source: archive/setline-1.20.0.

## Completed
- New editorial interface: Today/workout, Journal, Routines, Settings. CSS plate artwork, spring presses, entry/set motion, reactive voice meter, glass dock, local fonts and install icons. Reduced-motion fallback.
- Refinement pass: Coach is now a first-class dock destination with a readable persisted thread, expandable dark-glass sheet for voice answers, safe paragraph/list rendering, typed and voice composer paths, follow-up prompts, and retry-friendly error state. The dock is now Train / Journal / Voice / Coach / More; Routines and Settings are grouped in a blurred More dialog.
- Reused the store, parser, commands, speech services, AI, TTS and calculations. Added form/engine.js and one voice lifecycle owner.
- Voice/type/touch lifting flow; visible interpretations; cancellation; stale-context and destructive confirmations; undo; rest; history; editable routines.
- Optional browser speech recognition without Groq. Background microphone cleanup, denied-permission messages and type fallback. No raw audio storage.
- Personal Coach and validated plan generation. Removed inherited automatic nutrition targets from FORM's Coach context.
- Private profile import preserves history/current session; adds or updates routines and custom lifts. Added plate load labeled and persisted; unknown target reps/counts remain open.
- Journal check-ins for bodyweight, full-day calories/macros, sleep, energy, hunger, wrestling duration/effort and notes. Calendar-week weight averages with coverage counts. Coach receives notes, baseline and recent check-ins.

## Data and decisions
No schema upgrade. New versioned meta records: form.personal.v1, form.checkins.v1. Optional weightBasis/weightHint exercise metadata. Routine backups accept unconfirmed reps and open set counts without converting historical weights. Private profile/check-ins export separately from workout backups. Personal import file is outside Git. Old food/cardio/body data remains stored; those screens are outside this focused interface. English interface; EN/DA commands.

## Verified
327 Node tests passed (310 inherited, 17 new), including module parsing and AI/Coach behavior. `git diff --check` passed. The existing Chrome end-to-end suite remains the prior release evidence for 360/390/1440 layouts, voice/type pipeline, corrections, undo, cancellation, mocked microphone/permission error, stale AI suggestion, background capture cancellation, spoken finish confirmation, routine creation, storage failure/retry, reload and real service-worker offline restoration. A fresh browser run of that suite was not available in this checkout because the optional `playwright` package is not installed; phone microphone/provider behavior remains unverified.

## Limits / deferred
Coach sheet drag gestures are represented by an explicit Expand / Collapse control for reliable touch behavior; native dialog focus and backdrop handling are retained. A follow-up pass can add pointer-drag snap physics after real-device feedback.
Automated microphone/provider inputs are mocked. Actual Android microphone, Bluetooth, provider audio, 4G speed and install need device testing. Profile import is one explicit step because personal data is not embedded in the public site. No calorie prescription or fabricated targets. Plan editing occurs in saved routines. No advanced food scanner, body-photo or cardio UI here. Background rest alerts are not promised. An original Setline SW activation may still clear this copy's cache; this app cannot change the original.
