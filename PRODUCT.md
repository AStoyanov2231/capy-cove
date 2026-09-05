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
- Renewable raw materials, no tool durability, seed-positive farming and bait-free fishing prevent material depletion locks.
- Twenty buildable building types with themed multi-room interiors and furniture. Each player independently enters rooms or explores outside.
- Current world bounds: 256 × 256 units, 100 buildings and 200 crop plots per session. Not infinite chunk streaming or voxel terrain editing.
- PeerJS signaling establishes WebRTC sessions. Restrictive networks may require a separately configured TURN relay.
- Host tab owns the session; not a persistent MMO. No accounts or purchases.
- User authorized creating public repository AStoyanov2231/capy-cove and deploying to GitHub Pages after testing.

## Brand Commitments
Approved name: Capy Cove. Cozy, sunlit, low-poly 3D world. Preserve the capybaras and existing character customization.

## Product Principles
Keep rendering, game rules, networking, and UI independent. Shared actions must be validated by the host. Make joining a friend clear and recoverable.

## Open decisions
No hosted relay credentials supplied. The sandbox remains session-based, not persistent across host reloads. Furniture is furnished scenery, not a placement editor or production automation.
