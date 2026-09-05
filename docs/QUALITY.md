# Sandbox and visual-polish implementation status

## Verification boundary

The user explicitly requested that no further tests be run and that the code be pushed when complete.

- Before that instruction, the original game's two `tests/multiplayer.e2e.ts` scenarios passed. They describe the pre-sandbox baseline, not this implementation.
- `npm run lint`, `npm run build` (TypeScript and Vite) and `git diff --check` passed. None executes tests.
- The earlier sandbox pass ran a static design detector. It was not rerun for the visual-polish pass; its historical findings are not current validation. The generated design sidecar was already stale and was not manually modified.
- Sandbox unit and E2E scenarios were updated in source, but were **not executed**. The visual-polish pass updates E2E selectors for icon selection and the consolidated Game menu, without running them.
- Generated icon artwork was inspected on a proof sheet. The crystal icon was regenerated separately to avoid chroma-key fringe. Shipping artwork includes embedded generation provenance and complete prompts in `docs/art-source/PROMPTS.md`.
- No post-change browser walkthrough or in-game visual screenshot review was performed. There is no claim that the new multiplayer flow, room visuals, mobile layout, shader compilation or frame rate passed runtime QA. TypeScript compilation does not validate GPU shaders.
- The icon-driven HUD and 3D lighting/environment work are implemented, but production readiness and parity with a commercial game's visual polish remain unverified.

Existing CI remains configured. A successful push is not evidence that CI or GitHub Pages deployment succeeded.

## Coverage authored, not executed

`tests/game.test.ts` describes renewable gathering, tool costs and prerequisites, movement/collision, construction costs and spacing, independent room transitions, furniture collision, occupied-building protection, refunds, crop growth and seed returns, timed fishing, pearls, disconnect pause, seeded content and versioned protocol rejection.

`tests/adventure.e2e.ts` describes two real peers building a home, crafting a hoe, planting and harvesting, entering separate rooms, and remaining independently indoors/outdoors. It uses keyboard input rather than a teleport/debug hook. The multiplayer suite retains character selection, readiness, pickup synchronization, third-player rejection, disconnect/rejoin and touch controls.

## Scope and known limits

- This is a finite, seeded 256 × 256 world, not infinite chunk streaming or a voxel destruction/building system.
- Twenty building types have three themed rooms each, except the four-room inn. Furniture is modeled scenery with collision; furniture placement and production automation are not implemented.
- Crop watering is automatic. Crops and fish are collectible inventory outputs; there is no hunger, cooking or survival system.
- Resource nodes regenerate, tools do not break, seeds reproduce, and fishing needs no bait. Storage is capped at 9,999 of each item; sessions are capped at 100 buildings and 200 crops.
- The host tab owns the world. There is no disk save, host migration, backend persistence or provisioned TURN service. Guest disconnects pause simulation.
- The 3D game remains spatial/visual. Accessible HTML controls do not make this fully screen-reader-playable gameplay.

## Screenshots

Files under `docs/screenshots/` are historical captures of the original quest-based release. They are not current sandbox screenshots and are no longer used as a current README preview.
