---
name: Capy Cove
description: A sunlit low-poly sandbox for two friends
colors:
  leaf: "#305e43"
  ink: "#264d3b"
  muted: "#52674a"
  paper: "#fff9e9"
  lagoon: "#9bcab9"
  yellow: "#f3d78a"
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
- Simple, rounded controls that remain distinct from the angular 3D world.

## Colors

Leaf carries primary actions; ink carries headings and body text. Paper gives the gameplay HUD an opaque, readable surface over changing scenery. Yellow marks friendly feedback and interactable objects. Lagoon is the WebGL scene's base background; tone mapping and lighting change its final rendered appearance.

**The Scenery Rule.** Let the world provide color variation. Do not add unrelated accent colors to each HUD panel.

## Typography

Fredoka is the self-hosted display voice at medium weight. Nunito Sans is the self-hosted reading and control face. Headings are rounded and closely spaced without condensed or all-caps treatment. Display headings are roughly twice the size of in-game location titles. UI labels are compact; body copy is sentence case.

## Layout

Desktop setup occupies a paper-backed left column over a full-bleed world shifted right by the camera. At 760px and below, setup scrolls and the character form becomes a paper panel below the introduction. Gameplay keeps the viewport fixed: surroundings upper left, map upper right, sandbox tools and a compact material row below. Craft, Build, Farm and Bag open one nonmodal scrolling drawer. Choosing a blueprint closes the drawer and reveals a foundation preview with a separate confirmation control.

Touch devices get a directional pad. Desktop controls use camera-relative WASD/arrows. Native dialogs handle protected-focus tasks: help, the journal, connection failures, completion, and leaving a live session.

## Elevation & Depth

The world uses real mesh geometry, faceted vertex-colored terrain, directional shadows, hemisphere lighting and a higher-angle orthographic camera. Biomes use meadow, forest, sand, wetland, stone and snow palettes. Architecture has pitched roofs, framing, windows, flower boxes and themed details. Interiors use plank floors, rugs, cutaway walls, door frames, warm local light and modeled furniture with matching collision footprints. HUD panels use one shared ambient shadow (`0 12px 36px #2f51351a`), without an additional outline.

Entering a building switches only the local camera to a centered room view against a dark green surround, with a short fade. Side doors connect rooms. Remote players are visible only in the same outdoor or room instance. Reduced-motion preferences disable ambient water, windmill, bite and transition effects. Camera movement and player interpolation use time-based exponential smoothing.

## Shapes

Controls have modest rounded corners. HUD panels are slightly softer, dialogs softer again. Circular icon buttons and small player-name pills are the exceptions. The 3D art uses boxes, low-sided cylinders, and icosahedra; capybaras have broad barrel bodies, short legs, small ears, and flat muzzles.

## Components

- **Primary action:** leaf background, light text, clear action wording, optional trailing arrow. Disabled states retain readable text and cannot be activated.
- **Character selection:** labeled segmented buttons, outlined fur swatches, and accessory buttons. All selected options expose `aria-pressed`.
- **Surroundings:** current biome or room name, relevant gathering/door guidance, and the friend’s independent location. No quest or completion UI.
- **Shared bag:** synchronized materials, with four quick counts and the full material list in Bag. Tools are personal and explicitly labeled.
- **Recipes:** flat, separated rows with names, useful effects, material costs, prerequisites and owned/unavailable states. No nested cards.
- **Building preview:** a green or terracotta foundation, plus a textual placement reason and host-validated confirmation. Color is never the only validity signal.
- **Map:** cached seed-derived biome geography outdoors; footprint-aligned furniture and doorways indoors. Only players in the same interior instance appear on its room map.
- **Interaction prompt:** action text is computed from authoritative proximity. An unavailable prompt is disabled, not a misleading clickable action.
- **Dialogs:** native modal focus, Escape dismissal, a visible close button, and clear primary/secondary choices.
- **Icons:** selected Lucide line icons, with small authored geometric capybara, orange, and stone marks. No emoji icon substitutions.

## Do's and Don'ts

- **Do** keep the world visible and the next available interaction legible.
- **Do** show actual connection state and explain how to recover.
- **Do** preserve equal abilities across gender and cosmetic choices.
- **Do** use the existing outline focus treatment for all keyboard controls.
- **Don't** turn the screen into nested panels or add promotional content over gameplay.
- **Don't** claim a permanent saved world, guaranteed connectivity, or a provisioned TURN service.
- **Don't** substitute 2D artwork for the playable procedural scene.
