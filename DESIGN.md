---
name: Capy Cove
description: A sunlit low-poly island for two friends
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

**Creative North Star: "A very good day on a little island."**

The user's approved cozy, low-poly island is the visual authority. The actual WebGL scene leads; DOM controls sit around it. The visual mode is Experience, not a marketing page. Soft lettering and quiet controls support the faceted trees, capybaras, and lagoon.

**Key Characteristics:**
- Living procedural scenery, not a static hero image.
- Leaf-green controls, pale paper panels, turquoise water, and honey-colored capybaras.
- Simple, rounded controls that remain distinct from the angular 3D world.

## Colors

Leaf carries primary actions; ink carries headings and body text. Paper gives the gameplay HUD an opaque, readable surface over changing scenery. Yellow marks friendly feedback and interactable objects. Lagoon is the WebGL scene's base background; tone mapping and lighting change its final rendered appearance.

**The Scenery Rule.** Let the world provide color variation. Do not add unrelated accent colors to each HUD panel.

## Typography

Fredoka is the self-hosted display voice at medium weight. Nunito Sans is the self-hosted reading and control face. Headings are rounded and closely spaced without condensed or all-caps treatment. Display headings are roughly twice the size of in-game quest titles. UI labels are compact; body copy is sentence case.

## Layout

Desktop setup occupies a narrow left column over a full-bleed island shifted right by the camera. At 760px and below, setup scrolls and the character form becomes a single paper panel below the introduction. Gameplay keeps the viewport fixed, places the quest upper left, map upper right, actions below, and keeps the capybara near the center.

Touch devices get a directional pad. Desktop controls use camera-relative WASD/arrows. Native dialogs handle protected-focus tasks: help, the journal, connection failures, completion, and leaving a live session.

## Elevation & Depth

The world uses real mesh geometry, directional shadows, ambient light, and a fixed-angle orthographic camera. HUD panels use one shared ambient shadow (`0 12px 36px #2f51351a`), without an additional outline. Controls use borders for selection and field boundaries instead of stacked shadows.

Ambient animation is disabled by reduced-motion preferences. Gameplay motion remains functional. Progress fills use transforms rather than width animation. Camera movement and player interpolation use time-based exponential smoothing.

## Shapes

Controls have modest rounded corners. HUD panels are slightly softer, dialogs softer again. Circular icon buttons and small player-name pills are the exceptions. The 3D art uses boxes, low-sided cylinders, and icosahedra; capybaras have broad barrel bodies, short legs, small ears, and flat muzzles.

## Components

- **Primary action:** leaf background, light text, clear action wording, optional trailing arrow. Disabled states retain readable text and cannot be activated.
- **Character selection:** labeled segmented buttons, outlined fur swatches, and accessory buttons. All selected options expose `aria-pressed`.
- **Quest panel:** a journal control, current objective, shared count, progress fill, and an explicit cooperation hint.
- **Shared bag:** one compact row of item icons and synchronized counts, not separate personal inventory panels.
- **Map:** geography matches game coordinates; local and friend dots use distinct fills, while the destination is a diamond. Item locations appear only for the active quest.
- **Interaction prompt:** action text is computed from authoritative proximity. An unavailable prompt is disabled, not a misleading clickable action.
- **Dialogs:** native modal focus, Escape dismissal, a visible close button, and clear primary/secondary choices.
- **Icons:** selected Lucide line icons, with small authored geometric capybara, orange, and stone marks. No emoji icon substitutions.

## Do's and Don'ts

- **Do** keep the island visible and the current cooperative goal legible.
- **Do** show actual connection state and explain how to recover.
- **Do** preserve equal abilities across gender and cosmetic choices.
- **Do** use the existing outline focus treatment for all keyboard controls.
- **Don't** turn the screen into nested panels or add promotional content over gameplay.
- **Don't** claim a permanent saved world, guaranteed connectivity, or a provisioned TURN service.
- **Don't** substitute 2D artwork for the playable procedural scene.
