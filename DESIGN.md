---
name: Capy Cove
description: A sunlit low-poly sandbox for two friends
colors:
  leaf: "#32665b"
  ink: "#284e43"
  muted: "#52694e"
  paper: "#fff5db"
  lagoon: "#b4d9cc"
  yellow: "#e8bf6d"
  border: "#d9ddc3"
typography:
  display:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "clamp(44px, 3.6vw, 54px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Nunito Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "10px"
  panel: "14px"
  dialog: "16px"
spacing:
  tight: "8px"
  medium: "16px"
  roomy: "24px"
components:
  button-primary:
    backgroundColor: "{colors.leaf}"
    textColor: "#fff7dc"
    rounded: "{rounded.control}"
    padding: "13px 16px"
    height: "49px"
  button-secondary:
    backgroundColor: "#edeedb"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
---

# Design System: Capy Cove

## Overview

**Creative North Star: "Build a little life together."**

The approved cozy low-poly style remains the visual authority, extended into a seeded sandbox. The supplied top-down 3D reference informs enclosed room framing and architectural depth, not a replacement of the warm Capy Cove palette. The actual WebGL scene leads; DOM controls sit around it. Soft lettering and quiet controls support faceted terrain, capybaras and architecture.

**Key Characteristics:**
- Living procedural scenery, not a static hero image.
- Leaf-green controls, pale paper panels, turquoise water, and honey-colored capybaras.
- Sculpted low-poly pictograms, ivory menu frames and a teal wooden hotbar.
- Rounded characters, layered foliage and soft lighting over faceted terrain.

## Colors

Leaf carries primary actions; ink carries headings and body text. Paper gives the gameplay HUD an opaque, readable surface over changing scenery. Yellow marks friendly feedback and interactable objects. Lagoon is the WebGL scene's base background; tone mapping and lighting change its final rendered appearance.

**The Scenery Rule.** Let the world provide color variation. Do not add unrelated accent colors to each HUD panel.

## Typography

Fredoka is the self-hosted display voice at medium weight. Nunito Sans is the self-hosted reading and control face. Headings are rounded and closely spaced without condensed or all-caps treatment. Display headings are roughly twice the size of in-game location titles. UI labels are compact; body copy is sentence case.

## Layout

Desktop setup occupies a paper-backed left column over a full-bleed world shifted right by the camera. At 760px and below, setup scrolls and the character form becomes a paper panel below the introduction. Gameplay keeps the viewport fixed: a compact place name and friend indicator upper left, expandable map upper right, four icon actions centered below, and four quick resource counts at the edge.

Craft, Build, Farm and Bag open one nonmodal menu with an icon catalog and a single selected-item detail pane. On phones the catalog and detail stack in a scrollable body, while secondary HUD elements hide. Choosing a blueprint closes the menu and reveals a foundation preview with explicit confirmation.

Touch devices get a directional pad. Desktop controls use camera-relative WASD/arrows. Hotbar names and shortcuts appear on hover or keyboard focus; nearby interactions show their action only when relevant. Full controls live in How to play. Native dialogs handle game options, help, connection failures and leaving a session.

## Elevation & Depth

The world uses real mesh geometry and a higher-angle orthographic camera. Blended biome vertex colors, slope shading and drifting cloud shade soften faceted terrain. Warm directional light, cool fill, hemisphere light and environment reflections shape rounded characters, fuller tree canopies, instanced grass and flowers. Animated river ripples and height-following cascades give water motion. Buildings use pitched shingle roofs, beveled framing, masonry courses, glowing windows and themed details. Interiors use plank floors, rugs, cutaway walls, door frames, warm local light and modeled furniture with matching collision footprints.

The desktop finishing pipeline adds contact occlusion, restrained bloom, color grading and antialiasing. Coarse-pointer devices omit occlusion. Sustained slow frames disable postprocessing and lower resolution and shadow size. Gather feedback uses a bounded instanced particle pool. These are quality measures, not a verified frame-rate guarantee.

Entering a building switches only the local camera to a centered room view against a dark green surround, with a short fade. Side doors connect rooms. Remote players are visible only in the same outdoor or room instance. Reduced-motion preferences disable ambient animation, gather particles, bite animation and room fades. Camera movement and player interpolation use time-based exponential smoothing.

## Shapes

Controls have modest rounded corners; sculpted menu borders use reusable nine-slice artwork, not text baked into images. Circular utility controls and small player-name pills remain quiet. The 3D art combines beveled boxes, low-sided cylinders and rounded low-poly foliage; capybaras have capsule-shaped barrel bodies, short legs, small ears, softened muzzles and eye glints.

## Components

- **Primary action:** leaf background, light text, clear action wording, optional trailing arrow. Disabled states retain readable text and cannot be activated.
- **Character selection:** labeled segmented buttons, outlined fur swatches, and accessory buttons. All selected options expose `aria-pressed`.
- **Surroundings:** current biome or room name and a compact friend indicator. Friend location is available through its accessible label and tooltip. No coordinates, idle guidance, quests or completion UI.
- **Shared bag:** synchronized materials, four quick icon counts, and a full icon catalog in Bag. The selected resource reveals its name, quantity and source. Tools are personal.
- **Recipes:** an icon grid and one selected detail pane with a name, short effect, pictorial material costs and explicit prerequisites. Shortages use counts and a minus mark, not color alone. Owned tools receive a checkmark.
- **Building preview:** a green or terracotta foundation, plus a textual placement reason and host-validated confirmation. Color is never the only validity signal.
- **Map:** cached seed-derived biome geography outdoors; footprint-aligned furniture and doorways indoors. Only players in the same interior instance appear on its room map.
- **Interaction prompt:** action text is computed from authoritative proximity. Hide the prompt when idle or browsing menus; show the relevant key only when actionable. Resource renewal times never appear on the HUD. Waiting for a fish disables the action until the bite.
- **Dialogs:** native modal focus, Escape dismissal, a visible close button, and clear primary/secondary choices.
- **Icons:** 48 generated transparent WebP pictograms cover resources, tools, actions and all 20 buildings. Two generated frames provide the menu and hotbar surfaces. Shipping assets live in `public/art/`; complete prompts and provenance live in `docs/art-source/PROMPTS.md`. Icons are decorative inside semantically labeled HTML controls. Lucide remains for small utility actions. No emoji substitutions.

## Do's and Don'ts

- **Do** keep the world visible and the next available interaction legible.
- **Do** show actual connection state and explain how to recover.
- **Do** preserve equal abilities across gender and cosmetic choices.
- **Do** use the existing outline focus treatment for all keyboard controls.
- **Don't** turn the screen into nested panels or add promotional content over gameplay.
- **Don't** claim a permanent saved world, guaranteed connectivity, or a provisioned TURN service.
- **Don't** substitute 2D artwork for the playable procedural scene.
