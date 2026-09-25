# FORM — current checkpoint

Status: complete locally; deployment verification in progress. New build plan: form/PLAN.md. Previous plans: docs/SETLINE-PLAN.md. Prior source: archive/setline-1.20.0.

## Completed
- New editorial interface: Today/workout, Journal, Routines, Settings. CSS plate artwork, spring presses, entry/set motion, reactive voice meter, glass dock, local fonts and install icons. Reduced-motion fallback.
- Reused the store, parser, commands, speech services, AI, TTS and calculations. Added form/engine.js and one voice lifecycle owner.
- Voice/type/touch lifting flow; visible interpretations; cancellation; stale-context and destructive confirmations; undo; rest; history; editable routines.
- Optional browser speech recognition without Groq. Background microphone cleanup, denied-permission messages and type fallback. No raw audio storage.
- Personal Coach and validated plan generation. Removed inherited automatic nutrition targets from FORM's Coach context.
- Private profile import preserves history/current session; adds or updates routines and custom lifts. Added plate load labeled and persisted; unknown target reps/counts remain open.
- Journal check-ins for bodyweight, full-day calories/macros, sleep, energy, hunger, wrestling duration/effort and notes. Calendar-week weight averages with coverage counts. Coach receives notes, baseline and recent check-ins.

## Data and decisions
No schema upgrade. New versioned meta records: form.personal.v1, form.checkins.v1. Optional weightBasis/weightHint exercise metadata. Routine backups accept unconfirmed reps and open set counts without converting historical weights. Private profile/check-ins export separately from workout backups. Personal import file is outside Git. Old food/cardio/body data remains stored; those screens are outside this focused interface. English interface; EN/DA commands.

## Verified
327 Node tests passed (310 inherited, 17 new). Real Chrome end-to-end checks passed: 360/390/1440 layouts, voice/type pipeline, corrections, undo, cancellation, mocked microphone/permission error, stale AI suggestion, background capture cancellation, spoken finish confirmation, routine creation, storage failure/retry, reload and real service-worker offline restoration. Private profile import preserved active/history, imported five sessions, kept unknown reps blank and refused logging them. Check-in persistence and Coach context passed. Screenshots reviewed; rest moved above lineup on mobile. No uncaught browser errors.

## Limits / deferred
Automated microphone/provider inputs are mocked. Actual Android microphone, Bluetooth, provider audio, 4G speed and install need device testing. Profile import is one explicit step because personal data is not embedded in the public site. No calorie prescription or fabricated targets. Plan editing occurs in saved routines. No advanced food scanner, body-photo or cardio UI here. Background rest alerts are not promised. An original Setline SW activation may still clear this copy's cache; this app cannot change the original.
