# Capy Cove

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Approved: TypeScript, Three.js, Vite, and peer-to-peer multiplayer. Static hosting on GitHub Pages. No custom game server.

## Users
Two friends sharing an invite link to play together in a browser.

## Product Purpose
A polished top-view, low-poly 3D capybara sandbox for two friends, with procedural biomes, renewable gathering, fishing, farming, tool crafting and furnished buildings.

## Capabilities and Constraints
- Exactly two players choose male/female capybaras before spawning together.
- The former shared quests are removed, as requested.
- Seeded terrain with six variable biomes, elevations, river cascades and biome-specific materials.
- Renewable raw materials, nonbreaking basic tools, seed-positive farming and bait-free fishing prevent material depletion locks. Specialized fishing-kit repairs restore a catch bonus without disabling the starter rod.
- Six buildable types: Home house, Farmstead, Water dock, Greenhouse, Smithy and Observatory. Each has one distinctive room with functional furniture and independent player interiors.
- Authoritative quarter-turn placement rotates footprints, exterior parts, entry lanes and minimap geometry together.
- Building-local shared storage, explicit transfers, bounded station queues and safe output collection. Greenhouse beds support indoor crops; smithy and dock stations produce specialized tools.
- Shared day/night time, two-player sleep and night telescope exploration with twelve shared constellation discoveries.
- Current world bounds: 256 × 256 units, 100 buildings and 200 outdoor crop plots per session, with six indoor beds per greenhouse. Not infinite chunk streaming or voxel terrain editing.
- PeerJS signaling establishes WebRTC sessions. Restrictive networks may require a separately configured TURN relay.
- Host tab owns the session; not a persistent MMO. No accounts or purchases.
- User authorized creating public repository AStoyanov2231/capy-cove and deploying to GitHub Pages after testing.

## Brand Commitments
Approved name: Capy Cove. Cozy, sunlit, low-poly 3D world. Preserve the capybaras and existing character customization. Pursue the rounded forms, rich environment and lighting polish of the user's Slime Rancher reference without copying its assets or claiming equivalent production readiness. Use generated low-poly HUD frames and resource, tool and building icons. Keep gameplay text minimal, details selection-driven, and control hints contextual.

## Product Principles
Keep rendering, game rules, networking, and UI independent. Shared actions must be validated by the host. Make joining a friend clear and recoverable.

## Open decisions
No hosted relay credentials supplied. The sandbox remains session-based, not persistent across host reloads. Furniture layouts are authored data, not a player furniture-placement editor. Growing is automatically watered; there is no hunger, NPC economy or offline production. Detailed building rules and implementation defaults are in `docs/BUILDINGS.md`.
