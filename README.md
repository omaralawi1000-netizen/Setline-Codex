# FORM

A quieter way to get stronger. A voice-first gym journal with an editorial ivory/ink design and responsive motion.

[Open FORM](https://omaralawi1000-netizen.github.io/Setline-Codex/)

## Use
Tap the microphone, speak, tap again to send. Try “80 kilos for 8”, “same again”, “add 2.5”, “one more rep”, “skip rest”, “next exercise”, “what did I do last time?”, “finish workout”, then “confirm”. Danish: “80 kilo 8 gentagelser”, “samme igen”, “læg 2,5 til”. Type instead follows the same parser/dispatcher. Critical actions also have touch controls.

Without a Groq key, supported browsers can use their own speech recognition; their provider may process audio online. Groq improves dictation; Gemini provides Coach, plans and natural replies. Keys stay in this browser and are excluded from exports. Audio is never persisted. Network voice works on mobile data; no home-network server is needed.

## Your private profile
Settings → Import training profile → select your private FORM JSON → review and confirm. This adds/updates its routines and custom exercises while preserving history and the active session. Supplied baseline weights are not fabricated completed workouts; added load is labeled and unknown reps remain blank.

Settings → Edit coaching notes keeps ongoing context current. Journal → Log a check-in records reported whole-day intake, weight, sleep, energy, hunger and wrestling. Missing entries remain unknown. The Coach receives this context only when requested and does not receive automatic calorie/macro targets. Seven-day comparisons need at least three weigh-ins per period.

Export workout backups and your private profile/check-ins separately in Settings. Store these privately. API keys are excluded. Active workouts persist locally but are not included in completed-workout backups.

## Development
Serve the repository root with a static HTTP server. No application dependencies or build step. Microphones require HTTPS or localhost, not a plain HTTP LAN URL.

Run: node --test

Optional browser checks: node tools/form-browser-check.cjs
Use a development Playwright installation; set PLAYWRIGHT_PATH and CHROME_PATH if needed. FORM_SCREENSHOTS selects output. FORM_PRIVATE_PROFILE optionally points to a private import fixture; never commit it. Tests mock provider/speech input and do not establish actual microphone accuracy.

Read SPEC.md and PLAN.md. New UI is under form/; existing tested engine is under js/. Synchronize js/version.js and sw.js for each release. Deploy only to Setline-Codex. Original Claude repository stays untouched.

## Phone check
Accept the update without clearing site data. Import your personal file once. Test voice log/correct/undo/finish, denied permissions, background microphone closure, active-session restart and Wi-Fi-off dictation/Coach replies. Check Reduced motion and Chrome's install option.
