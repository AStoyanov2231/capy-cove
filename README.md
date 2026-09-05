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

The in-game HUD uses generated low-poly resource, tool and building icons. Open a catalog and select an icon to see its name, costs and action, rather than reading a screen full of recipes. Nearby actions appear contextually; controls and settings live in the Game menu. Artwork and generation prompts are recorded in `docs/art-source/PROMPTS.md`.

### A renewable sandbox

- **Gathering:** wood, stone, oranges, fiber and wild seeds need no tool. Ordinary resources renew after 25 simulation seconds; ores after 45. Resources covered by buildings return when the building is dismantled. Nodes wait to renew if a player is standing on them.
- **Crafting:** stone axe, stone pickaxe, garden hoe and starter rod remain hand-craftable and never break. Copper axes and iron pickaxes require the smithy's forge, anvil, workbench and grindstone. The dock produces hooks, nets and specialized fishing kits. All inputs are renewable, with no starter-tool dependency loop.
- **Fishing:** use a starter rod at a dry riverbank or dock deck, cast with E, wait three seconds for the bite and reel within five seconds. Moving cancels the cast. No bait is consumed. Highland and snow rivers yield trout; other rivers yield river fish. Every third catch brings a pearl. A specialized kit doubles catches for twelve uses between dock repairs; a worn kit falls back to the always-working starter rod.
- **Farming:** use Farm with a crafted hoe to plant wheat or carrots on open meadow or forest soil. Crops water themselves, mature in 45 simulation seconds, and yield three crops plus two seeds. Wild seed nodes replenish even if every stored seed is spent.
- **Building:** select a blueprint and walk to position its full-model preview north of you. Press **R** or tap Rotate for clockwise quarter turns, then choose **Place building**. The host validates rotated foundations, exterior parts, door clearance, terrain, costs and spacing. Docks place their rear and pier over water with their entrance on land. Rotation is permanent after placement.
- **Independent interiors:** E at a rotated entrance transitions only your view into that building's authored room. The front doorway leads outside. One player can use a station indoors while the other gathers or uses another building. Room dimensions and furniture footprints drive authoritative collision, camera framing and the minimap.

### Six functional buildings

- **Home house:** two functional beds, a hearth, supper furniture and a shared storage chest. Both players resting in distinct beds skips night.
- **Farmstead:** food crates, sacks, baskets and sorting furniture. Explicitly deposit or withdraw farm food from its shared local store.
- **Water dock:** a stilted fishing workshop and pier. Make hooks, weave nets, assemble specialized fishing kits and repair their bonus at the appropriate station.
- **Greenhouse:** six individually plantable indoor beds, seed storage and potting furniture. Crops grow without outdoor biome restrictions and return more seeds than planting consumes.
- **Smithy:** smelt ore into bars at the forge, shape heads at the anvil, assemble at the workbench and finish advanced tools at the grindstone.
- **Observatory:** a tall, open-roofed telescope silhouette and star chamber. At night, search the sky, hold a cluster in the reticle and record twelve shared zodiac-inspired discoveries.

Every building has one distinctive room and its own shared storage. Stations consume only backpack materials, never silently pull from building stores. Four-job station queues continue while players explore, with two ready-output slots. Completed products wait safely when output space or backpack capacity is full. Personal tools and repairs must be collected by their owner; material outputs can be collected by either player.

Dismantling requires empty storage, no jobs, harvested plots, no occupants and space for the entire construction refund. Nothing is silently discarded. The ten-minute day/night cycle pauses with the session. Sleep changes the sky to dawn, not production or crop timers. See `docs/BUILDINGS.md` for the full design and safety rules.

### Procedural geography

Each host generates a random seed for a **finite 256 × 256 world**, substantially larger than the original island. Warped biome regions and layered terrain noise vary the layout, hills and dunes between worlds. This is not infinite Minecraft-style chunk streaming or editable voxel terrain.

- Sunlit meadows: starting resources and fertile soil.
- Whispering woods: abundant wood, fiber and copper.
- Amber dunes: sand, copper and stone.
- Willow wetlands: clay and reeds.
- Cascading highlands: elevation, river cascades, iron and crystal.
- Frostpine peaks: snowy ridges, iron and crystal.

All raw materials have renewable sources. No tool or recipe requires a finite quest reward. Sessions currently allow 100 buildings, 200 outdoor crop plots, six beds per greenhouse and 9,999 units of each backpack material. Inventory limits are storage caps, not a depletion of the world’s resources.

The host can open the Game menu and enable **Builder test mode** while testing. It fills the shared bag, makes crafting and building costs free, and shows an active status badge. Use **Return to normal resources** in the same menu to restore the bag from before testing; buildings, tools, local storage, production jobs and discoveries already created remain in the session. Placement, station proximity, queue capacity and storage safety still apply.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD or arrows | Direction pad |
| Gather / harvest / fish / use doors | E or Space | Context action button |
| Craft / Build / Farm / Bag | C / B / G / I | Hotbar icons |
| Expand / collapse map | M or click map | Tap map |
| Rotate placement clockwise | R, only while placing | Rotate button |
| Cancel menu or blueprint | Escape | Close / cancel button |
| Send a heart | H | Heart button |
| Zoom | Mouse wheel | Default camera framing |
| Sound / help / leave / builder test mode (host) | Top-right Game menu | Top-right Game menu |

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

`tests/game.test.ts` covers the sandbox rules and protocol. `tests/buildings.test.ts` adds rotation, furniture access, storage, production, ownership, sleep, greenhouse and astronomy scenarios. `tests/adventure.e2e.ts` exercises placement rotation, independent indoor storage and outdoor farming through DOM controls. The multiplayer scenarios cover readiness, movement, pickup synchronization, third-player rejection, disconnect/rejoin and mobile controls. Builder test mode is an explicit host-only, reversible testing control; it does not provide teleportation or client-side authority. See `docs/QUALITY.md` for what was actually verified for this change; test definitions are not evidence that they passed.

## Architecture

```text
src/
  main.ts              Session lifecycle and dependency wiring
  game/
    schema.ts          Version 4 Zod wire types and bounded commands
    content.ts         Recipes, materials, buildings, rooms, furniture footprints
    geography.ts       Seeded biomes, terrain height and renewable resource nodes
    engine.ts          Browser-independent authoritative simulation
    input.ts           Camera-relative keyboard and touch movement
  network/
    session.ts         Peer lifecycle, handshakes, capacity and protocol routing
  render/
    renderer.ts        Camera, local interior switching, interpolation and previews
    world.ts           Procedural scenery and building-renderer exports
    buildings.ts       Data-driven shells, exterior parts and functional room models
    capybara.ts        Cosmetic models and animation
    batching.ts        Static material-based mesh batching
    finish.ts          Adaptive postprocessing and water/wind materials
    particles.ts       Bounded instanced gathering feedback
  ui/
    interface.ts       Setup, lobby, surroundings, sandbox menus and dialogs
    workshop.ts        Icon catalogs and selected-item details
    building-use.ts    Storage, production, plots, sleep and telescope views
    building-use.css   Responsive furniture-interaction surfaces
    art.ts             Base-path-aware generated icon references
    hud.css            Responsive icon HUD and nine-slice menu frames
    minimap.ts         Seeded world map and collision-aligned room maps
    audio.ts           Optional synthesized sounds
    icons.ts           Selected Lucide icons and escaping
```

The host owns all gameplay. Guests send bounded movement vectors, quarter-turn selections, telescope aim and enumerated intent, never player positions, inventory totals, placement coordinates or output totals. Host rules resolve interaction proximity, resource readiness, costs, tool requirements, placement and room transitions. Protocol v4 includes rotation, local storage, production, indoor plots, day/night activity and constellation progress, retaining the reversible builder test mode. Old clients are not compatible and must reload.

Simulation runs at 30 fixed steps/second, snapshots at 10/second and input refreshes at 20/second. Short stalls use bounded catch-up; stale inputs expire. Disconnects pause simulation time, production, crops, sky time and resource regeneration. Rejoining retains the guest's tools, interior and shared progress while the host remains online; sleep and telescope activity are cleared.

Rendering consumes the same terrain sampling and furniture footprints as the engine. Rounded capybaras, layered tree canopies, beveled architecture, grass, flowers, butterflies and flowing water remain real 3D scenery. Static meshes batch by material; understory and gather particles are instanced, and distant resource models are culled. Grass clears under placed foundations. Warm sun, cool fill and environment reflections combine with restrained bloom, desktop contact occlusion and antialiasing. Sustained slow frames disable postprocessing and reduce resolution and shadow size. Reduced motion freezes ambient effects. Local view transitions never change another player’s view.

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
