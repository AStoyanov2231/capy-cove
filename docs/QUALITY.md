# Building overhaul implementation status

## Verification boundary

The user explicitly requested that tests not be run yet. No unit, E2E or gameplay tests were executed for this overhaul.

- TypeScript/Vite production compilation, ESLint and `git diff --check` passed. These do not execute tests.
- Unit and E2E sources were updated to the six-building catalog, one-room layouts, quarter-turn placement and protocol v4. New building scenarios are authored, not evidence that they passed.
- No post-change browser walkthrough, GPU shader validation, screenshot comparison or frame-rate measurement was performed. The room models, mobile controls, queue UX, telescope view and live multiplayer flow remain runtime-unverified.
- Existing generated icons for the six retained buildings are reused. Fourteen obsolete shipping building icons were removed. Historical atlases and exact generation prompts in `docs/art-source/` are provenance only, not current catalogs.
- One static Impeccable scan reported 21 advisory token/ramp findings and no non-advisory findings. The design metadata sidecar predates the overhaul and was not manually rewritten. Static styling diagnostics are not gameplay verification.

A successful push is not evidence that CI or GitHub Pages deployment succeeded. Production readiness and commercial-game visual parity are not claimed.

## Coverage authored, not executed

- `tests/game.test.ts`: baseline gathering, renewable nodes, handcrafting, movement, construction, one-room collision, refunds, farming, fishing, disconnects, builder mode and versioned snapshots.
- `tests/buildings.test.ts`: approved catalog, explicit furniture layout bounds and access connectivity; rotated geometry and entry positions; recipe reachability; storage restrictions, capacity and atomic transfers; bounded queues, blocked output retention, duplicate collection, personal tool ownership, dock repairs and disconnect pause; greenhouse seed returns and full-bag safety; distinct beds and sleep timing; night/proximity/alignment checks and shared constellation deduplication; dismantling protection and invalid commands.
- `tests/render.test.ts`: resource ownership, static batching, model independence, exterior transforms and retained greenhouse/interaction subtrees.
- `tests/adventure.e2e.ts`: two real peers cycling placement rotation, entering a home independently, depositing/withdrawing materials while the other player remains outside, and growing crops through real DOM controls.
- `tests/multiplayer.e2e.ts`: readiness, movement, synchronized gathering, third-player rejection, disconnect/rejoin and touch controls.

## Scope and known limits

- Finite, seeded 256 × 256 world; no infinite chunks or voxel editing.
- Six building types, one authored room each. No player furniture editor, room extensions or NPC automation.
- Ten-minute simulation day. Sleep changes sky time only, not crop or production time.
- Telescope progression uses twelve fictional zodiac-inspired asterisms, not an accurate ephemeris or real-world astronomy tool.
- Basic and smithy tools never break. The optional fishing kit needs renewable dock repairs to restore its double-catch bonus; the starter rod always remains usable.
- Crops water automatically. Watering, potting, compost and some decorative furniture have no separate production recipe.
- Four jobs and two ready-output slots per station, explicit collection, no destructive cancellation. Storage and full output/refund checks prevent silent loss.
- Session-based world: no disk save, host migration, backend persistence or provisioned TURN service. Disconnects pause production and growth.
- Builder mode restores only the pre-test backpack, not the whole world. Jobs, structures, local storage and discoveries created in that mode remain.
- Accessible HTML controls do not make the spatial 3D game fully screen-reader playable.

## Screenshots

`docs/screenshots/` contains historical captures of the original quest-based release. Those files are not current building-overhaul screenshots.
