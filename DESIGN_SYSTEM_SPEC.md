Design System Document: The Ethereal Concierge
1. Overview & Creative North Star
The Creative North Star: "The Ethereal Concierge"
In the high-end hospitality sector, service is invisible yet omnipresent. This design system moves away from the rigid, boxy constraints of traditional "Bootstrap-style" dashboards to embrace an editorial, fluid aesthetic. We are not just building a management tool; we are crafting a digital atmosphere that mirrors the premium experience of a luxury hotel lobby.
To break the "template" look, this system utilizes intentional asymmetry—where weight is balanced by whitespace rather than centered boxes—and tonal depth. We replace harsh containment lines with soft transitions of light and blur, ensuring the UI feels like a series of sophisticated, layered surfaces rather than a flat screen.
---
2. Colors & Surface Philosophy
Our palette is anchored by the deep, authoritative `background` (#0d1322), providing a canvas where our primary Cyan and accent Emerald can truly glow.
The "No-Line" Rule
Explicit Instruction: Designers are prohibited from using 1px solid borders for sectioning or containment.
Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a sidebar should be defined by `surface_container_low` sitting against the `surface` background, not by a stroke.
Surface Hierarchy & Nesting
Treat the UI as a physical environment with stacked sheets of frosted glass.
Base Layer: `surface` (#0d1322)
Secondary Sections: `surface_container_low` (#151b2b)
Active Cards/Modals: `surface_container_high` (#242a3a)
Floating Elements: `surface_container_highest` (#2f3445)
The "Glass & Gradient" Rule
To achieve a "signature" feel, main CTAs and hero backgrounds should utilize a subtle linear gradient from `primary` (#9de2ff) to `primary_container` (#00ccff). For floating elements (like the collapsible sidebar or notifications), apply Glassmorphism: use semi-transparent `surface_variant` colors with a `backdrop-blur` of 20px to 40px.
---
3. Typography: Editorial Authority
We use a dual-font strategy to balance character with legibility.
The Statement (Headlines): Plus Jakarta Sans is our voice of modern luxury. Use `display-lg` and `headline-lg` with tight letter-spacing (-0.02em) to create an authoritative, high-end editorial feel.
The Workhorse (UI/Body): Inter handles the data. Its neutral, high-legibility profile ensures that dense hotel management stats remain clear.
Hierarchy as Identity
Stats & Numbers: Use `headline-lg` in `primary` (#9de2ff) to make growth metrics feel like achievements.
Labels: Use `label-md` with 5% letter-spacing in `on_surface_variant` (#bbc8d0) for a sophisticated, "all-caps" secondary navigation feel.
---
4. Elevation & Depth
Hierarchy is achieved through Tonal Layering rather than structural shadows.
The Layering Principle
Depth is created by "stacking." Place a `surface_container_lowest` card on a `surface_container_low` section. The change in hex value provides a soft, natural lift that mimics fine paper or brushed metal.
Ambient Shadows
When a "floating" effect is required (e.g., a hovered stat card), use an extra-diffused shadow:
Blur: 40px - 60px
Opacity: 6% - 8%
Color: A tinted version of `surface_tint` (#5ed4ff) rather than pure black. This mimics the way cyan light would naturally refract in a dark room.
The "Ghost Border" Fallback
If a border is absolutely necessary for accessibility (e.g., input fields), use the Ghost Border: the `outline_variant` token at 15% opacity. Never use 100% opaque, high-contrast borders.
---
5. Components
Stat Cards
Structure: Use `lg` (2rem) rounded corners.
Interaction: On hover, the card should transition from `surface_container_low` to `surface_container_high` with a subtle Y-axis lift of -4px.
Accents: Use a 4px vertical "glow bar" on the left edge using `secondary` (#66dd8b) for growth metrics.
Data Tables
Forbid Dividers: Do not use horizontal lines between rows.
Separation: Use `body-md` for text. Differentiate rows using alternating backgrounds of `surface` and `surface_container_low`, or simply generous vertical whitespace (1.5rem padding per row).
Header: Use `label-sm` in `tertiary` (#ffd096) for column headers to provide a warm, professional contrast.
Buttons
Primary: Full-pill shape (`full`). Background: Gradient of `primary` to `primary_container`. Text: `on_primary`.
Secondary: Transparent background with a `Ghost Border`.
States: On press, apply a `surface_bright` inner glow to simulate the button being physically depressed.
Collapsible Sidebar
Style: Glassmorphic panel using `surface_container_low` at 80% opacity with a 30px backdrop blur.
Active State: The active menu item should not have a box; it should use a `primary` text color and a small `primary` circle (4px) to the left of the label.
---
6. Do's and Don'ts
Do:
Embrace Whitespace: Use the `xl` (3rem) spacing token between major dashboard widgets. Luxury is defined by the "space between."
Use Tonal Success: Use `secondary` (Emerald Green) for growth and `tertiary` (Soft Orange) for warnings, but always in small, intentional doses (chips or icons), never large blocks of color.
Roundedness: Maintain the `lg` (2rem) or `xl` (3rem) radius for all major containers to keep the system feeling soft and approachable.
Don't:
Don't use pure black: Use `#0d1322` for shadows and backgrounds to keep the "inkiness" of the dark mode professional.
Don't use 1px dividers: If you feel the need to separate elements, increase the padding or shift the background tone instead.
Don't crowd the Topbar: The search and notification area should feel like a quiet gallery header—minimal icons, generous spacing, and a `surface_container_lowest` search bar background.