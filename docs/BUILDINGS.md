# Functional building system

## Confirmed scope

Six buildable types: Home house, Farmstead, Water dock, Greenhouse, Smithy and Observatory. Each has one authored room, not a reused three-anchor layout. Construction remains session-based, with independent player interiors and a shared backpack.

The visual direction is chunky low-poly geometry, restrained detail and an exaggerated functional centerpiece: beds, food crates, fishing bench, planting beds, forge/anvil or telescope. Existing generated icons for these six types are retained. Removed types have no shipping icon or catalog entry. The original generation atlas and prompts remain historical provenance, not available game content.

## Authoritative data flow

- `src/game/schema.ts`: protocol v4 enums, quarter-turn rotation, bounded commands, building-local stock, production jobs, indoor plots, activity state and shared discoveries. Older peers must reload; there is no saved-world migration because sessions are not persisted.
- `src/game/content.ts`: building and room dimensions, exterior parts, furniture IDs/poses/footprints/access points, station capacities, recipe graphs, crop and sky definitions. Furniture is authored explicitly; `roomFurniture()` is not a positional generator.
- `src/game/engine.ts`: authoritative placement, collision, reachability checks at interaction time, atomic transfers, queue acceptance/completion/collection, plot growth, sleep and discovery validation. Every mutation comes through bounded intent, never client-supplied positions or output totals.
- `src/render/buildings.ts`, re-exported by `src/render/world.ts`: reusable shell styles, exterior components and furniture models. The renderer reads state and never produces inventory, advances jobs or records discoveries.
- `src/ui/building-use.ts`: proximity-opened storage/station/plot dialogs and the telescope sky view. Opening a menu does not reserve items. Commands are revalidated against the player's current building and furniture access point.

## Placement and rotation

R, or the placement-only Rotate button, advances 0, 90, 180, 270 degrees clockwise on the north-up X/Z map. Three.js uses the corresponding negative Y rotation. All geometry is generated in local coordinates before that one root transform is applied.

The host derives the snapped candidate center from its player position and the selected building's dimensions. The client sends only the building kind and a validated quarter turn. The full preview and footprint overlay update together; invalid rotations stay red and show a placement reason. Geometry, external props, clearance rectangles, entry lanes, minimap footprints and door positions consume the same transform. Rotation cannot be edited after construction. Placement stays active for repeated construction until canceled; host rejection never silently dismisses the preview.

Ordinary foundations and entrances require dry ground. The dock instead requires its rear and pier tip in water, with its front entrance on land. Its pier, porch and stilts are part of the exterior definition. Walkable decks lift rendered players and do not apply the swimming slowdown. Placement samples transformed rectangles at intervals no larger than one world unit and rejects excessive slope, world-edge crossings, overlapping buildings, occupied foundations and unharvested crops.

Interior coordinates are canonical to the room view, independent of exterior rotation. Exiting returns to the rotated exterior entrance. Room dimensions and furniture bounds also drive the minimap and camera framing.

## Building purposes

- **Home house:** two exclusive bed interactions, hearth, supper table and two chairs, shelves, hooks and a 300-unit shared chest. Both connected players must rest in distinct beds to skip night; they may use separate houses. Movement or getting up cancels rest.
- **Farmstead:** a 2,000-unit food store. Crates, baskets and barrels access the same building-local stock. Oranges, wheat, carrots and both fish types are accepted. No automatic transfers or generic ore storage.
- **Water dock:** fishing workbench and net-making table, tackle storage, drying and rope racks, and a 600-unit store. Hooks and nets feed the specialized fishing kit. Spare nets can be unwoven without losing fiber.
- **Greenhouse:** six individually addressable planting beds, protected from biome restrictions, plus water, seeds, potting and compost props. Each bed consumes one seed, grows in 45 simulation seconds, and yields three crops and two seeds. A hoe is required. The other growing props are decorative; watering remains automatic. Storage holds 800 units.
- **Smithy:** four actual production stages: forge turns renewable ore and wood into bars; anvil shapes heads; workbench assembles unfinished tools; grindstone finishes personal advanced tools. Material storage holds 1,000 units. Quench barrel and tool racks reinforce the workshop layout.
- **Observatory:** night-only telescope, star-map table, shelves, desk and charts, plus a 300-unit expedition chest. Pan the sky or center a cluster, hold the reticle on it for two simulation seconds, then record it. All twelve zodiac-inspired asterisms are authored in a fictional game sky, not an astronomical ephemeris. Discoveries are shared, deduplicated and retained for this session.

## Tools and servicing

Stone axe, stone pickaxe, hoe and starter fishing rod remain hand-craftable from renewable basics and never break. Advanced axes and pickaxes require the smithy pipeline and retain their nonbreaking behavior.

The specialized fishing kit doubles fish yields for twelve successful catches between repairs. Its bonus then becomes inactive; the starter rod still catches fish normally, so servicing never gates fishing or pearls. The dock repair recipe consumes renewable fiber and a hook. Repairs use the same bounded queue and owner-only collection as personal tool production; collecting the repair restores the bonus. There is no hunger or universal tool-durability system.

## Storage and production safety

Building storage is shared by both players but local to one building. Capacity is a total item count, while the backpack retains its per-item 9,999 cap. Transfers are explicit positive integer amounts and all-or-nothing. A withdrawal that cannot fit does not subtract anything from storage. Crafting always uses the shared backpack, never silently pulls from building storage.

Every station has four total job slots, including finished work, and two ready-output slots. The first unfinished job processes serially. A completed job waits intact when both output slots are occupied, blocking later work until an output slot opens. Inputs are consumed exactly once, only after the host accepts a valid, affordable job with space in the queue. Rejected requests never charge inputs.

Collection is explicit. Material outputs are shared; personal tools and repair jobs belong to the requesting player. A full backpack leaves the finished job untouched. Duplicate jobs for the same personal tool or repair are rejected. Jobs, plants and their outputs remain in their building while either player explores elsewhere.

Dismantling requires no occupants, empty storage, harvested indoor plots, no pending/ready jobs and enough backpack space for the complete construction refund. There is no destructive queue cancellation or automatic item discard. Outdoor harvesting and fishing also check complete yields before consuming their opportunity.

## Time, pause and builder mode

The shared day/night cycle lasts ten simulation minutes. Sleeping changes only the sky offset to dawn; it does not fast-forward production, crops or action cooldowns. Guest disconnection pauses all simulation clocks. Telescope/rest activity is cleared on disconnect to prevent stale activity on rejoin; buildings, stock, plots, jobs and discoveries remain.

Builder test mode still waives recipe and placement material costs and explicitly restores the pre-test backpack on exit. It does not bypass placement, station proximity, queue capacity, storage restrictions or output safety. Buildings, jobs, tools, local storage and discoveries created during builder mode remain. Restore mode intentionally replaces the test backpack; it is not a save/revert of the whole world.

## Verification boundary

Unit/E2E sources cover the new protocol, geometry, furniture access, storage, queues, personal ownership, pause, greenhouse harvests, sleep and discovery. They have not been executed for this overhaul, per the user's instruction. TypeScript/Vite compilation and lint are separate static checks. Neither proves GPU output, layout, multiplayer behavior or production readiness.
