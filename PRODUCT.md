# Capy Cove

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Approved: TypeScript, Three.js, Vite, and peer-to-peer multiplayer. Static hosting on GitHub Pages. No custom game server.

## Users
Two friends sharing an invite link to play together in a browser.

## Product Purpose
A low-poly 3D capybara adventure with a rich environment, character selection, cooperative quests, and collectible items.

## Capabilities and Constraints
- Exactly two players choose male/female capybaras before spawning together.
- Shared picnic, garden restoration, and hot-spring quests, proposed and approved.
- PeerJS signaling establishes WebRTC sessions. Restrictive networks may require a separately configured TURN relay.
- Host tab owns the session; not a persistent MMO. No accounts or purchases.
- User authorized creating public repository AStoyanov2231/capy-cove and deploying to GitHub Pages after testing.

## Brand Commitments
Approved name: Capy Cove. Cozy, sunlit, low-poly island adventure.

## Product Principles
Keep rendering, game rules, networking, and UI independent. Shared actions must be validated by the host. Make joining a friend clear and recoverable.

## Open decisions
No hosted relay credentials supplied. Current adventure is session-based, not persistent across host reloads.
