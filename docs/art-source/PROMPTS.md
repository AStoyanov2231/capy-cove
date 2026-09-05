# Capy Cove generated UI art

Generated with Pi `codex_generate_image`, using the OpenAI Codex backend `gpt-image-2`. No CLI/API model fallback was used. Slime Rancher was a user-supplied quality reference; no Slime Rancher assets are used.

Shipping assets: `public/art/icons/*.webp`, `public/art/menu-frame.webp`, `public/art/hotbar-frame.webp`. The current catalog retains 34 raster icons: 16 resource illustrations (including a spare sprout), 12 tool/action illustrations, and six buildings (home, farm, dock, greenhouse, smithy, observatory). Fourteen obsolete building icons were removed in the building overhaul. Each retained icon is normalized to a transparent 256 × 256 canvas. The two frames are cropped WebP assets used as a scalable menu border and hotbar backplate.

The original prompts and atlases below document the historical 48-icon generation, not the current building roster. They are intentionally preserved verbatim as provenance. The overhaul did not generate new raster assets; processed materials use small authored vector glyphs in `src/ui/art.ts`, and the specialized fishing kit reuses the rod image.

Resource/building/tool atlas cell order is the order specified below. `resources-crystal.webp` uses the dedicated green-key replacement, not the original magenta-key atlas crystal. Intermediate originals remain in Pi's generated-images directory. Source atlases and chroma sources are kept here for reference, outside the production bundle.

Post-processing: Pillow, the imagegen skill's `remove_chroma_key.py`, alpha-edge contraction, per-cell cropping, centered 216px artwork on 256px canvases, small detached fleck cleanup, WebP encoding. Source dimensions returned by the backend can differ from requested dimensions; cropping uses actual image dimensions. Resource keying was adjusted to preserve violet hues, and the crystal was regenerated on green after its magenta-key edge proved unsuitable. Menu/frame alpha was supplied by the Pi tool output and locally trimmed. Icons were inspected together on a cream proof sheet; the crystal replacement was inspected separately. These are asset inspections, not gameplay QA.

## Resource atlas

Source ID: `ig_05e14c9a7db219c6016a9c5e8eae9487d291f5aa33441412ec`. Original: `resources-source.png`; alpha atlas: `resources-atlas.webp`.

```text
Use case: stylized-concept. Asset type: production game inventory ICON ATLAS for Capy Cove, a cozy 3D capybara sandbox. Generate ONE square 2048x2048 sprite atlas with EXACTLY 4 columns and 4 rows, 16 equal invisible 512x512 cells. Each isolated icon centered in its own cell, no overlap, no dividers, no typography. Consistent polished low-poly 3D clay-like collectible objects, soft rounded bevels, clean faceting, soft upper-left light, warm saturated colors, readable chunky silhouettes like a premium colorful ranch-exploration game. Camera 3/4 isometric, identical scale language. Objects fill 65 percent of each cell with generous empty padding. Entire background perfectly uniform solid #FF00FF magenta for removal. No floor, no cast shadows outside objects, no ambient background, no outlines, no text or watermark. Required cell contents LEFT TO RIGHT, TOP TO BOTTOM: row 1: three little orange fruits with green leaves; a small beige seed pouch open with golden seeds; three chunky grey smooth stones; two short wooden logs with visible rings. Row 2: a tied bundle of green plant fibers; three terracotta clay chunks; a little pile of golden sand with one sandstone pebble; a chunky copper ore rock with shiny orange metal facets. Row 3: a chunky iron ore rock with blue-grey metal facets; a cluster of lavender faceted crystals; three golden wheat stalks tied together; two orange carrots with green leafy tops. Row 4: a plump turquoise river fish; a plump silvery lavender spotted trout; three ivory pearls inside a pale opened shell; a small golden sprout growing from soil. Critical: exactly sixteen separate icons, each object alone in the specified cell. No magenta anywhere inside objects.
```

## Tools and actions atlas

Source ID: `ig_03a11b125a4b4686016a9c5e8e649087d2a4d4f1e1ff218465`. Atlas: `tools-atlas.webp`.

```text
Use case: stylized-concept. Asset type: production TOOLS AND ACTIONS ICON ATLAS for Capy Cove cozy 3D sandbox. Generate ONE landscape 2048x1536 sprite atlas with EXACTLY 4 columns and 3 rows, twelve equal invisible 512x512 cells. Each isolated icon centered, fills 65 percent of own cell. Polished low-poly 3D collectible game art, soft chunky bevels, subtle clean facets, charming rounded silhouettes, soft upper-left light, caramel wood, sage and teal colors with honey-gold accents. Identical three-quarter view and coherent proportions. Solid perfectly uniform #FF00FF magenta background for removal. No floor plane, no cast shadow outside objects, no text, no dividers, no labels, no watermark, no magenta in subjects. Exact contents left to right top to bottom: row 1: stone axe with caramel wooden handle; stone pickaxe with caramel wooden handle; garden hoe with a blue-grey metal blade and wooden handle; simple bamboo fishing rod with curved fishing line and small turquoise bobber, compact diagonal silhouette. Row 2: upgraded copper axe with orange-copper metal head; upgraded iron pickaxe with silver-blue metal head; a cozy little wooden crafting workbench with mallet; a rolled blue-green building blueprint with a small wooden house sitting on it. Row 3: a terracotta garden planter with two leafy sprouts; a small rounded sage-green backpack with golden clasp; a folded illustrated island map with a small wooden compass; two overlapping coral red hearts. Critical exactly 12 icons in this exact grid, roomy cells, no overlapping neighboring cells.
```

## Building atlas

Source ID: `ig_0697dface67b2806016a9c5e8e5afc87d2a9d1cf4f698d7761`. Atlas: `buildings-atlas.webp`.

```text
Use case: stylized-concept. Asset type: production BUILDING ICON ATLAS for Capy Cove, cozy low-poly 3D sandbox. Generate ONE 2560x2048 landscape atlas, EXACTLY 5 columns by 4 rows, 20 equal invisible square cells, one miniature building centered in each. Consistent isometric 3D game UI building icons, high quality soft rounded low-poly geometry, carved timber, honey plaster, chunky roofs, forest sage, lagoon teal, terracotta, amber. Soft upper left lighting, visible entrances and windows, simple distinctive silhouettes, not photorealistic, no tiny clutter. Every building fills around 70 percent of its own cell with clear empty padding. Perfectly flat solid #FF00FF magenta background, no magenta on the buildings. No bases connecting buildings, no contact or cast shadows outside subjects, no text, letters, numbers, grids or watermark. Exact left-to-right top-to-bottom contents: ROW 1: cozy cream home with terracotta pitched roof and chimney; red timber farm barn with hay bale; wooden water dock with little teal-roof tackle cabin; timber workshop with blue-grey roof and workbench; forest cottage with mossy green roof. ROW 2: sage framed glass greenhouse; pastel bakery with brick chimney and bread display; dark stone blacksmith forge with chimney and anvil; alpine timber mountain lodge with snowy blue roof; cream library with book-filled window and small tower. ROW 3: large welcoming two-story inn with terracotta roof; cream windmill with four timber sails; teal boathouse with small boat on the side; sage apothecary with herb planters; stone observatory with copper dome and telescope. ROW 4: small tea house with curved green pagoda roof; timber warehouse with stacked crates; terracotta pottery studio with pots outside; pale stone bathhouse with teal tiled roof and small pool; elegant cream museum with columns and lavender roof. All 20 buildings must be visibly different, individually separated, consistent scale, polished collectible diorama quality.
```

## Menu frame

Source ID: `ig_0c0400415b4b74a9016a9c5f036ec087d29a28c457d92ea482`. Shipping output: `public/art/menu-frame.webp`.

```text
Use case: stylized-concept. Asset type: a SINGLE reusable blank inventory MENU FRAME sprite for a cozy high-end low-poly 3D game, Capy Cove. Square 1024x1024. Straight-on orthographic front view, no perspective. A subtly beveled rounded-square hand-carved warm ivory wooden panel with a restrained deep lagoon-teal outer edge, honey-gold inner lip, tiny carved leaf details ONLY at the four corners, softly faceted sculpted low-poly appearance. Premium tactile cheerful ranch-adventure game UI, not gritty fantasy, not ornate medieval. Panel occupies precisely the central 90% of image, centered with 5% clear padding. Border decoration confined to the outer 12% of the panel. Crucially the entire inner 76% is perfectly blank pale warm ivory #FFF5DB, flat and quiet with no markings, artwork, text, symbols, slots, buttons, grain, gradients or lighting variations so game content can be overlaid. Soft bevel highlights only on outer border. Background outside the panel perfectly uniform solid #FF00FF magenta for removal. Do not use magenta inside panel. No drop shadow onto background, no lettering, no extra UI, no watermark. The frame must be suitable for nine-slice scaling to wide rectangular menus.
```

## Hotbar frame

Source ID: `ig_0e896feafb079fac016a9c5f029a5c87d29fe1be8d71c6ea4f`. Shipping output: `public/art/hotbar-frame.webp`.

```text
Use case: stylized-concept. Asset type: ONE blank gameplay HUD HOTBAR BACKPLATE sprite for Capy Cove, a polished cozy low-poly 3D sandbox. Wide horizontal 1536x512 image. Straight-on orthographic front view. A single long softly rounded rectangular teal enamel and carved honey-wood instrument tray. Chunky sculpted low-poly bevels, refined soft highlights, charming tactile toy-like material, warm brass trim, leaf-shaped corner fastenings at the far left and right only. Keep shape symmetric and clean, rounded rectangle. Plate fills 92 percent of image width and 68 percent of height, precisely centered. Middle 85 percent of width must be a blank uninterrupted dark muted lagoon teal surface #315E59 with no compartments, no slots, no text, no symbols, no controls or decoration. The game will draw its own icon buttons on top. All dimensional decoration confined to perimeter. Perfectly uniform solid #FF00FF magenta background outside frame, no magenta in subject, no cast shadows on background, no scenery, no watermark. This is a production UI sprite, not a screenshot, concept sheet or full screen layout.
```

## Replacement crystal

Source ID: `ig_077ce0e42f094391016a9c67e01ca887d2ae72ba85e051921c`. Style reference: `resources-source.png`. Original: `crystal-source.png`. Shipping output: `public/art/icons/resources-crystal.webp`.

```text
Use case: stylized-concept. Asset type: single production inventory icon, matching the attached Capy Cove resource atlas. Reference image is style reference only; do NOT recreate the atlas. Generate ONLY one chunky cluster of five lavender and violet crystals growing from a dark violet stone base, centered on a perfectly uniform solid bright GREEN #00FF00 background for removal. Square 1024x1024, subject fills 70% of image with generous padding. Polished low-poly 3D collectible, subtle rounded bevels and clear broad crystal facets, soft upper-left light, coherent three-quarter view matching the reference. Opaque lavender crystals, not glass or transparent. No green anywhere in the subject. No floor plane, no shadow on background, no pink or magenta background, no lettering, no labels, no other objects, no watermark. Keep the silhouette compact and crisp, all crystal tips and the entire base visible.
```
