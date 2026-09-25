# FORM — current specification

Omar requested a fresh, surprising voice-first gym app on 2026-09-25. This supersedes the old visual and phase brief. Previous specs are in docs/ and release 1.20.0 is preserved in Git.

An editorial training journal: warm ivory, dark ink, muted olive, vermilion, Instrument Serif headlines and DM Sans controls. Locally bundled fonts, a CSS-machined weight plate, physical press/entry/set motion, a live voice meter, readable numbers and reduced-motion support.

Keep the tested plain JavaScript engine and IndexedDB database. Root index.html loads form/app.js. Reuse the existing store, parser, commands, speech/AI providers, workout math and canonical kg. No production demo history or embedded provider keys.

Required flow: start routine/open session; log by voice, type or touch; repeat/correct/undo; add/swap/navigate exercises; timestamp-based rest; performance questions; explicit finish confirmation; history; editable routines; personal Coach; validated AI plan creation; settings. Show interpretation and safely cancel late results. Surface storage failures and retry.

Voice: tap to record, tap again to send. Groq transcription and Gemini replies/Coach use the user's browser-stored keys. Browser SpeechRecognition is an optional fallback without Groq. It may use the browser vendor's online service. No raw audio persistence. Backgrounding closes capture and invalidates pending commands. HTTPS works over mobile data without a local server.

Personal coaching: import private training-profile JSON into device storage. Do not embed Omar's personal data in the public source. Preserve added plate load and unconfirmed reps/counts/exercise choices. Imported baselines are not completed workouts. Journal check-ins record reported intake, weight, sleep, energy, hunger and wrestling. Missing data is null, not zero. Use calendar trends and coverage counts. Include user preferences and recent records in Coach requests; do not invent calorie/macro targets.

Release: run node --test and tools/form-browser-check.cjs; review phone/desktop screenshots, cancellation, confirmation, failure/retry, restart/offline persistence and profile import. Commit and publish only to Setline-Codex. Original Setline stays untouched. Real microphone, Bluetooth, natural audio and mobile-data latency require a phone.
