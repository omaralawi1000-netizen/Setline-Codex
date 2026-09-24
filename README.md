# Setline

This is the independent **Setline Codex** copy, based on Claude's full 1.19.0 release. Its GitHub Pages app installs as “Setline Codex” and keeps workouts, settings and keys separate from the original Setline app, even though both sites use the same GitHub Pages domain. You can intentionally transfer workouts and settings with Settings → Export/Import backup. API keys are excluded from backups and must be entered again in this copy.

Open [Setline Codex](https://omaralawi1000-netizen.github.io/Setline-Codex/) in Android Chrome. Install from Chrome's menu if desired. When an update is offered, tap it; do not clear site data or uninstall to update. Version 1.20.0 adds safer voice cancellation and workout saving, larger workout controls, keyboard accessibility, and the optional Pearl theme (Today → Customize).

## Development

Serve this directory with any static HTTP server, for example `python -m http.server 8080`, then open `http://localhost:8080`. There are no application dependencies to install or bundle. Run `node --test` for parser, workout, calculation, backup, microphone lifecycle, syntax and service-worker consistency checks. HTTPS or localhost is required for microphone access; a phone opening a plain HTTP LAN address cannot use the microphone.

The production deployment is GitHub Pages from `main`, repository root. Keep `js/version.js` and `sw.js` versions synchronized. Read `SPEC.md` and the current checkpoint in `PLAN.md` before changes. Publish only to this duplicate repository unless Omar explicitly requests changes to the original.

## Voice and data

Groq handles recorded speech-to-text, Gemini handles optional AI interpretation and Coach replies/speech, and supported workout commands are interpreted locally after transcription. Configure your own keys in Settings. They remain in this browser's local storage and are excluded from backups; no provider credentials belong in source control. Voice and AI require an internet connection, including on mobile data. Touch workout logging works offline after the app has cached successfully. Raw recordings are not persisted.

If a workout save fails, the app retains the pending state in memory and shows a retry control. Keep the app open, resolve the storage problem and retry before closing. Finishing and discarding only clear the active workout after their storage transaction succeeds. Browser/OS suspension can delay rest notifications; keep the app visible for dependable live countdowns.

## Phone check for 1.20.0

1. Check the version and try Pearl under Today → Customize.
2. Start Push Day. Say “80 kilos for 8”, then “same again”. Check the displayed interpretation and saved sets.
3. Try “cancel” before a pending command completes, then correct a set and Undo. Cancelled commands must never appear later.
4. Background the app while listening; the Android microphone indicator should disappear. Return and record again. Try Danish: “80 kilo 8 gentagelser”.
5. Close/reopen an active workout and check its sets and rest timestamp. Finish, confirm, and check that History contains it once.
6. Turn off Wi-Fi, use mobile data, ask the Coach a question, and listen for a complete reply. Report the visible error if a provider fails.

Automated browser checks use mocked provider responses. They do not establish real-device microphone accuracy, naturalness or network latency.
