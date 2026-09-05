# Capy Cove

Gather. Grow. Build a little life together.

A two-player, low-poly 3D browser sandbox built with TypeScript, Three.js, Vite, and PeerJS. The world, capybaras, buildings and furnished interiors are procedural 3D meshes. Fonts ship locally. No account or custom game server is required.

**[Play Capy Cove](https://astoyanov2231.github.io/capy-cove/)**

## Take a friend into the world

1. Choose a name, capybara and cosmetic accessories.
2. Create a world and send your private invite link to a friend.
3. Both choose **I’m ready to explore**.
4. Gather by hand, craft tools, fish, plant crops or choose a building blueprint. There are no quests or completion gates.

The shared bag starts with a few basic supplies. Inventory is shared; crafted tools belong to the player who makes them. Cosmetics never change abilities.

### A renewable sandbox

- **Gathering:** wood, stone, oranges, fiber and wild seeds need no tool. Ordinary resources renew after 25 simulation seconds; ores after 45. Resources covered by buildings return when the building is dismantled. Nodes wait to renew if a player is standing on them.
- **Crafting:** stone axe, stone pickaxe, garden hoe, fishing rod, copper axe and iron pickaxe. Tools improve yields, unlock ores and never break. Basic tools use renewable hand-gathered materials, so progression has no consumable-tool dependency loop.
- **Fishing:** take a rod to a dry riverbank, cast with E, wait three seconds for the bite and reel within five seconds. Moving cancels the cast. No bait is consumed. Highland and snow rivers yield trout; other rivers yield river fish. Every third catch brings a pearl.
- **Farming:** use Farm with a crafted hoe to plant wheat or carrots on open meadow or forest soil. Crops water themselves, mature in 45 simulation seconds, and yield three crops plus two seeds. Wild seed nodes replenish even if every stored seed is spent.
- **Building:** select a blueprint, walk to position the highlighted foundation north of you, and choose **Place building**. Host rules enforce costs, spacing, terrain slope, dry foundations and accessible entrances. Docks and boathouses need a riverbank. Dismantling from the front door refunds all construction materials; occupied buildings cannot be removed.
- **Independent interiors:** press E at a front door to transition into a furnished cutaway room. Side doors lead to the building’s other rooms. The front doorway in each room leads outside. Each player has their own location, view and camera, so one can craft indoors while the other gathers outdoors. Walls and furniture have authoritative collision.

### Twenty furnished buildings

Home house, farmstead, water dock, workshop, forest cottage, greenhouse, bakery, smithy, mountain lodge, library, cozy inn, windmill, boathouse, apothecary, observatory, tea house, warehouse, pottery studio, bathhouse and island museum.

Every building has three themed furnished rooms; the inn has four. Furniture is scenery with collision, not a furniture-placement editor or a separate production machine. Tools can be crafted indoors or outdoors.

### Procedural geography

Each host generates a random seed for a **finite 256 × 256 world**, substantially larger than the original island. Warped biome regions and layered terrain noise vary the layout, hills and dunes between worlds. This is not infinite Minecraft-style chunk streaming or editable voxel terrain.

- Sunlit meadows: starting resources and fertile soil.
- Whispering woods: abundant wood, fiber and copper.
- Amber dunes: sand, copper and stone.
- Willow wetlands: clay and reeds.
- Cascading highlands: elevation, river cascades, iron and crystal.
- Frostpine peaks: snowy ridges, iron and crystal.

All raw materials have renewable sources. No tool or recipe requires a finite quest reward. Sessions currently allow 100 buildings, 200 crop plots and 9,999 units of each inventory material. Inventory limits are storage caps, not a depletion of the world’s resources.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD or arrows | Direction pad |
| Gather / harvest / fish / use doors | E or Space | Context action button |
| Craft / Build / Farm / Bag | C / B / G / I | Labeled toolbar buttons |
| Cancel menu or blueprint | Escape | Close / cancel button |
| Send a heart | H | Heart button |
| Zoom | Mouse wheel | Default camera framing |
| Sound / help / leave | Top-right buttons | Top-right buttons |

Movement is camera-relative. Swimming is automatic and slower. Sound is optional. Reduced-motion settings disable ambient effects and room fades without disabling gameplay.

## Run locally

Requires Node.js 22.12+ (or 24+) and npm.

```sh
npm ci
npm run dev
```

Normal development uses public PeerJS signaling. Invite links must use an address the guest can reach; `localhost` only works on the same computer. Use the host’s LAN IP and port for another device on the LAN.

```sh
npm run build      # TypeScript and production compilation, no tests
npm run lint       # Static lint, no browser execution
npm run check      # Lint, unit tests, TypeScript, production build
npm run test:e2e   # Real browser WebRTC peers and local signaling
npm run preview
```

`tests/game.test.ts` covers the sandbox rules and protocol. `tests/adventure.e2e.ts` exercises construction, independent interior rooms and farming through DOM keyboard controls. The multiplayer scenarios cover readiness, movement, pickup synchronization, third-player rejection, disconnect/rejoin and mobile controls. There are no production teleport/debug hooks. See `docs/QUALITY.md` for what was actually verified for this change; test definitions are not evidence that they passed.

## Architecture

```text
src/
  main.ts              Session lifecycle and dependency wiring
  game/
    schema.ts          Version 2 Zod wire types and bounded commands
    content.ts         Recipes, materials, buildings, rooms, furniture footprints
    geography.ts       Seeded biomes, terrain height and renewable resource nodes
    engine.ts          Browser-independent authoritative simulation
    input.ts           Camera-relative keyboard and touch movement
  network/
    session.ts         Peer lifecycle, handshakes, capacity and protocol routing
  render/
    renderer.ts        Camera, local interior switching, interpolation and previews
    world.ts           Procedural scenery, architecture and furnished rooms
    capybara.ts        Cosmetic models and animation
    batching.ts        Static material-based mesh batching
  ui/
    interface.ts       Setup, lobby, surroundings, sandbox menus and dialogs
    minimap.ts         Seeded world map and collision-aligned room maps
    audio.ts           Optional synthesized sounds
    icons.ts           Selected Lucide icons and escaping
```

The host owns all gameplay. Guests send bounded movement vectors and enumerated intent, never positions, inventory totals, placement coordinates or room identifiers. Host rules resolve interaction proximity, resource readiness, costs, tool requirements, placement and room transitions. Protocol v2 replaces the old quest protocol; old clients are not compatible.

Simulation runs at 30 fixed steps/second, snapshots at 10/second and input refreshes at 20/second. Short stalls use bounded catch-up; stale inputs expire. Disconnects pause simulation time, crops and resource regeneration. Rejoining restores the guest’s tools, room and progress while the host remains online.

Rendering consumes the same terrain sampling and furniture footprints as the engine. Static meshes batch by material; understory is instanced and distant resource models are culled. Resolution and shadow size adapt to sustained slow frames. Local view transitions never change another player’s view.

## Networking and session lifetime

GitHub Pages serves static files. PeerJS signaling introduces the browsers, STUN discovers routes, and WebRTC data channels carry state directly. There is no backend database.

- The host must keep the tab open and preferably visible. **Host reloads, closing the tab or leaving ends the world. There is no save system or host migration.**
- Guest disconnects pause gameplay. Reopen the same invite to reclaim the second slot while the host remains online. This is an invitation, not account authentication; keep it private.
- Corporate Wi-Fi, VPNs, symmetric NAT and restrictive firewalls may require TURN. No TURN relay is provisioned by this repository.
- `.env.example` documents signaling and TURN settings. `VITE_*` values are public browser configuration, not secrets. Use short-lived credentials from a secured endpoint for a production TURN service; do not commit real credentials.
- PeerJS’s shared signaling service has no uptime guarantee. Peers can learn each other’s network addresses. This is friends-only co-op, not hardened competitive multiplayer.

## Deployment

`.github/workflows/pages.yml` builds and deploys `dist/` when `main` is pushed. Repository **Settings → Pages → Source** must be **GitHub Actions**. Relative Vite assets support the repository subpath; invitations use query parameters and need no SPA redirect.

A push is not proof of deployment. The Pages workflow must finish successfully before calling a new version live. Test-only signaling environment variables do not affect production builds.

`PRODUCT.md` records approved scope, `DESIGN.md` the visual system, and `AGENTS.md` contributor rules. Dependency notices ship under `public/licenses/`; see `THIRD_PARTY.md`. No separate license is granted to the original game code or artwork by this repository.
