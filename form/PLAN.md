# FORM — build plan

The user requested a surprising, independently designed voice-first gym app in this repository on 2026-09-25. This supersedes the old visual specification. Preserve the tested engine and stored data; replace presentation deliberately.

## Direction
An editorial training instrument: warm paper, ink, vermilion, quiet serif headlines and precise tabular numbers. An animated machined weight plate is the signature object. Functional spring presses, sliding navigation, live voice levels, set arrivals and a timestamp-driven rest dial. No artificial dashboards or pretend statistics.

## Implementation sequence
1. Preserve Setline 1.20 in a local branch and archive specifications. Reuse its database, parsing, command resolution, providers, workout logic and calculations.
2. Build a responsive Today/workout, journal, editable routines and settings. Provide voice and touch for the complete lifting loop. Preserve current workouts and all historical records.
3. Connect explicit tap-to-start/tap-to-send dictation, visible interpretation, cancellation, confirmation and undo. Use existing Groq/Gemini keys; browser speech recognition is an optional fallback when available. All text can be typed. Backgrounding cancels the microphone and pending requests.
4. Verify core flows in Chrome at phone and desktop sizes, permission/cancellation paths, restart/offline persistence, reduced motion, keyboard access and tests. Publish to Setline-Codex only.

## Scope / limitations
No raw audio storage. Browser recognition availability is platform-specific and may use the browser vendor's network service. Provider keys remain in the browser as in the existing app. Real microphone quality and 4G latency require Omar's device. Old food/body/cardio data is retained; those screens are not part of this focused new interface. AI plan generation uses existing validated provider logic rather than invented offline responses.

## Status
Complete and verified locally; see root PLAN.md for final results and deployment. No schema migration. Archive branch: archive/setline-1.20.0.
