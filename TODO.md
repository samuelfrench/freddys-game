# Freddy's Game TODO

## Completed Analytics Instrumentation
- [x] 2026-08-26: Added the assigned GA4 tag and prepared Google Search Console verification META tag to the document head in source commit `05db4a1`. Local verification passed 202/202 Vitest tests, production build, 10/10 Playwright campaign/climbing tests, exact source/dist tag checks, and inspected desktop/mobile browser interaction. GitHub Fly Deploy run `32960229945` passed for the exact source commit and produced Fly release `v9`, image `freddys-game:deployment-01M0YV2G2ZY92890CRFAG35HGB`; live HTTP and isolated Chromium desktop/mobile proved the exact expected META value, `G-3RY2VWTM2G` loader/config, one exact `gtag/js` request per viewport, a rendered interactive game canvas, 0 console/page/request failures, and no overflow. Verification token contents were never printed; GSC ownership verification remains intentionally deferred.

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
