# Freddy's Game TODO

## Active Analytics Instrumentation
- [~] 2026-08-26: Add the assigned GA4 tag and prepared Google Search Console verification META tag to the document head, run unit/build/e2e verification, push through the existing deploy workflow, and verify the exact live tags plus `gtag/js` request without exposing the verification token.

## Current State
- [x] Three-level campaign: Moonlit Castle, Sunset Beach, Storm Reef Showdown.
- [x] Level 2 beach environment with sand, surf, palms, boardwalk, tide pools, and reef gate.
- [x] Final level boss battle with two Ally Ninja teammates and Storm Shogun boss.
- [x] Objective HUD plus in-world waypoint markers for the shrine, reef gate, and Storm Shogun.
- [x] Dedicated boss health bar with attack telegraph warning text and visible arena danger marker.
- [x] Restart checkpoint support for the current level, with full-campaign restart still available.
- [x] Verification: `npm test`, `npm run build`, `npm run test:e2e`, real-input campaign Playwright, mobile HUD regression, console check, WebGL canvas pixel smoke, and desktop/mobile screenshots.

## Follow-Up Ideas
- [ ] Tune boss fight pacing after a manual playtest pass.
- [ ] Add a short victory/retry results panel after defeating Storm Shogun.
