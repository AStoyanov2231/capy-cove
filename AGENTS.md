# Capy Cove contributor guide

- Read `README.md` for architecture, multiplayer constraints, local setup, and deployment. `PRODUCT.md` holds approved scope; `DESIGN.md` holds the visual system.
- Keep authoritative game rules browser-independent in `src/game/engine.ts`. Treat every network message as untrusted; update the versioned schemas in `src/game/schema.ts` with protocol changes.
- Game content is defined in `src/game/content.ts`. Rendering, input, transport, and UI consume that content rather than defining competing game state.
- Reproduce bugs through the real two-browser flow first. Never ship test-only teleport/debug hooks in the production game.
- Run `npm run check` and `npm run test:e2e` before pushing. The Pages workflow must finish successfully before claiming a deployment is live.
- Never commit real TURN credentials or `.env` files. Anything prefixed `VITE_` is public browser configuration, not a secret.
- Do not manually edit generated build output, lockfile contents, or changelogs. Use the package manager for dependency changes.
