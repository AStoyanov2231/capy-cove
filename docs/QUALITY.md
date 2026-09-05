# Release verification

## Automated verification

- `npm run check`: ESLint, 18 unit tests, strict TypeScript checking, and production build pass.
- `npm run test:e2e`: all three browser scenarios pass using two actual WebRTC peers and a local PeerJS signaling server.
- The long browser scenario collects and uses all required items, requires both player contributions, and reaches the completion dialog on both peers. Movement goes through the input handler, not teleportation or state injection.
- The other scenarios cover selection, readiness, shared spawn and pickups, movement, a third-player rejection, guest departure, host pause, guest reconnection with preserved progress, mobile pointer controls, keyboard help dismissal, and horizontal overflow.
- A separate production-bundle smoke test passed with the public PeerJS service and a synchronized pickup, not the local test signaling server.
- `npm audit`: no reported vulnerabilities in the installed dependency tree at release verification time.

### Defects found and resolved

1. Fixed-step ticks previously slowed the simulation under rendering stalls. A bounded accumulator now runs the necessary fixed steps.
2. Guest browsers could receive a lobby snapshot before their handshake added the guest player. The host now waits for the handshake, and the guest rejects snapshots without its slot.
3. Distinct Three.js `Color` instances collided in the material cache. Cache keys now use color values; a regression test covers shared and distinct colors.
4. Static scenery generated unnecessary draw calls. Immutable meshes now batch by material without swallowing animated/reward subtrees. Sustained slow frames also trigger lower canvas resolution and smaller shadow maps.
5. The design detector found a progress-width animation. It was replaced with a transform-based fill.
6. Browser tests originally overshot targets through automation round-trip latency. Full-adventure steering now runs through DOM keyboard events in the page and waits for a settled stop, while the shorter scenario separately verifies real Playwright keyboard/pointer input.
7. The first GitHub run exposed software-GPU timing flakiness. Static shadows are now cached instead of regenerated every frame, input changes send immediately, and CI renders at half device-pixel ratio while preserving CSS viewport sizes and all gameplay assertions. Automatic retries are disabled, flaky results fail, and test budgets account for software rendering. The updated suite passes locally in CI mode.

## Finish review

Review performed inline because this harness did not expose an independent reviewer/subagent tool. No generated reference comp was supplied; the user's approved cozy low-poly island direction and the implemented page are the visual authority. The approved skill update replaced its old concept-seed script, so no random direction seed is claimed.

**Disposition: ship.** This is a review of the specified friends-only, session-based game, not a claim of universal connectivity or complete nonvisual accessibility.

### Persistence

Pass: `PRODUCT.md` records approved scope and `DESIGN.md` documents the built world. The design contract is retained in the production HTML. Source, tests, networking limitations, deployment instructions, and third-party notices are documented.

### Fidelity

| Element | Verdict | Evidence |
| --- | --- | --- |
| Type | Match | Self-hosted Fredoka display and Nunito Sans controls maintain the storybook voice. |
| Material | Match | The full-bleed island and capybaras are real playable low-poly meshes. |
| Ground | Match | Leaf greens, lagoon water, pale sand, and honey-colored characters carry the approved scene. |
| First viewport | Match | Left-side character setup and an open live diorama on desktop. |
| Mobile layout | Adaptation | Setup scrolls in a paper panel; gameplay stays fixed with a thumb-accessible pad and action button. |
| Cooperative progression | Match | Both peers visibly share the objective, backpack, and three-quest completion. |

### Ceiling

The implementation uses the requested 3D medium directly: faceted scenery, shadows, animated capybaras, swimming, butterflies, bobbing pickups, and persistent quest rewards. Mobile HUD labels are compact; the game still fundamentally requires visual/spatial play. No full screen-reader gameplay claim is made.

### Material fixes

Clear for this release. The detector's single mechanical finding is resolved. Third-party signaling availability, restrictive-network TURN needs, and host-tab lifecycle are documented operational constraints, not hidden promises.

### Keep

Keep the procedural world, simple two-person joining flow, readable shared goal, and equal character abilities. Do not dilute them with marketing chrome or move game authority into UI/rendering code.

## Captures

- `screenshots/setup-desktop.png`: 1440 × 900 setup.
- `screenshots/setup-mobile.png`: 390px mobile setup, full-page capture.
- `screenshots/game-desktop.png`: shared-spawn gameplay.
- `screenshots/game-mobile.png`: 390 × 844 touch gameplay.
- `screenshots/adventure-complete.png`: full-adventure completion reached by both players.

Browser screenshots and traces are produced by local E2E verification. These checked-in captures record the initial release, not a promise that every future commit has the same pixels.
