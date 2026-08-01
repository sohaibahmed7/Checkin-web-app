---
name: Check-In
description: A warm, rounded "friendly notice board" marketing site for Check-In, Halton's community safety app
colors:
  paper: "#FFF8F0"
  paper-deep: "#FDEEDE"
  ink: "#3A2E28"
  muted: "#7A6B61"
  purple: "#7C5CBF"
  purple-deep: "#5C3FA0"
  purple-tint: "#F1ECFA"
  green: "#34C08B"
  green-deep: "#23815D"
  green-tint: "#E7F7F1"
  green-text: "#1F7353"
typography:
  display:
    fontFamily: "Baloo 2, ui-rounded, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 2.4vw + 1.6rem, 4rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Baloo 2, ui-rounded, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Baloo 2, ui-rounded, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 800
    lineHeight: 1.3
rounded:
  sm: "12px"
  md: "20px"
  lg: "28px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "16px 40px"
  button-primary-hover:
    backgroundColor: "{colors.purple-deep}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.purple-deep}"
    rounded: "{rounded.pill}"
    padding: "16px 40px"
  button-secondary-hover:
    backgroundColor: "{colors.purple-tint}"
    textColor: "{colors.purple-deep}"
  card:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "32px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 18px"
---

# Design System: Check-In

## Overview

**Creative North Star: "The Friendly Notice Board"**

Check-In's marketing site reads like a real neighbor posting a real notice — warm, rounded, and human, not an institutional safety bulletin. Every surface is soft: rounded pill buttons, generously rounded cards, diffuse tinted shadows instead of hard edges. Purple is the one color that carries over from the product's earlier identity — every neighbor's-eye-view CTA, every moment that matters, reads in purple. A warm green secondary (echoing a marker circled in a notebook) adds the human, hand-touched warmth: a soft hand-drawn underline marks emphasis words instead of italics, and a cream base replaces stark white or black.

The mood is warm and approachable first, credible second — the opposite ordering from a typical safety-app's black-canvas urgency. This is still a real safety product backed by a real partnership (Crime Stoppers of Halton), so nothing here is twee or cartoonish: no mascots, no game-show energy, no fabricated "rescue story" content. The warmth comes from shape and color, not illustration — rounded corners, soft shadows, a friendly rounded display typeface, and a hand-drawn accent, applied with restraint to a real product's real facts.

**Key Characteristics:**
- Warm cream background (`#FFF8F0`) — never stark white or black as the default surface.
- Purple (`#7C5CBF`, carried over from the prior identity) is the one loud accent; green (`#34C08B`) is the warm secondary, used for the hand-drawn accent and secondary highlights.
- Baloo 2 (bold, rounded, high personality) for every heading; Nunito Sans for body copy and all UI chrome. No mono font anywhere — the earlier system's uppercase tracked labels read too institutional for this world.
- Rounded everywhere: pill buttons (`border-radius: 999px`), generously rounded cards (20–28px). Zero sharp corners.
- Soft, diffuse, color-tinted shadows (real blur) — never a hard offset block shadow.
- A hand-drawn green underline marks emphasis words in headlines — the system's one illustrated touch, applied consistently and sparingly.

## Colors

Warm-neutral base (cream, warm charcoal ink) with purple as the fixed primary accent and green as the warm secondary.

### Primary
- **Purple** (`#7C5CBF`): The one color that means "this matters" — CTAs, links, active states, stat numbers, the hand-drawn... no, the underline is green; purple is reserved for filled surfaces and text emphasis color itself.
- **Purple Deep** (`#5C3FA0`): Hover/pressed state for purple-backed elements; also used as a rich background for the dark features panel.

### Secondary
- **Green** (`#34C08B`): The true logo green — matches the checkmark in the Check-In mark. The warm human touch: the hand-drawn underline accent, nav active-underline, footer social hover. Reserved for icon/decorative use, never paired with white text (fails contrast at 2.3:1).
- **Green Deep** (`#23815D`): The button-safe fill — used as the resting background for solid green buttons (inline newsletter submit, map "Place a Ping") where white text sits on top; the bright green itself is too light for that pairing.
- **Green Text** (`#1F7353`): The darkest shade — doubles as readable green text on light backgrounds (partner label, newsletter kicker) and as the hover-darken state for the same buttons Green Deep fills at rest.

### Neutral
- **Paper** (`#FFF8F0`): Default page background.
- **Paper Deep** (`#FDEEDE`): Slightly deeper cream for tonal variation (logo tiles, dividers).
- **Ink** (`#3A2E28`): Primary text color — warm charcoal, not cold navy-black.
- **Muted** (`#7A6B61`): Secondary/body text where full ink is too heavy.
- **Purple Tint** (`#F1ECFA`): Soft purple wash for masthead, hover backgrounds, icon chips.
- **Green Tint** (`#E7F7F1`): Light green used as text/icon color on dark surfaces (the features panel), where the bright green itself would read too dark against purple-deep — never used as a background.

### Named Rules
**The Purple Carries Over Rule.** Purple is the one color inherited from the product's prior identity — never change its hue family. Every other color in this palette is new to this system.

**The Bright-Green-Is-Icon-Only Rule.** Plain green (`#34C08B`) is a fill/icon/decorative color only — it fails WCAG AA both as text on cream/white (measured ~2.2:1) and as a solid button fill under white text (measured ~2.3:1). Any green text uses `green-text`; any solid green button fill uses `green-deep` at rest and `green-text` on hover.

## Typography

**Display Font:** Baloo 2 (with ui-rounded, system-ui fallback)
**Body Font:** Nunito Sans (with ui-sans-serif fallback)

**Character:** A bold, genuinely rounded display face carries every heading with real personality and warmth; a clean rounded-adjacent humanist sans carries body copy and all UI chrome. No separate label/mono voice — the earlier system's uppercase tracked mono for nav/buttons/labels read institutional and was dropped entirely in this world.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 2.4vw + 1.6rem, 4rem)`, 1.15 line-height): Hero headline only.
- **Headline** (700, `clamp(1.75rem, 3vw, 2.5rem)`): Section titles.
- **Title** (700, `1.25rem`–`1.7rem`): Card/subsection headings.
- **Body** (400, `1rem`, 1.6 line-height, `{colors.muted}` for secondary copy): Paragraph text.
- **Label** (800, `0.8rem`–`0.95rem`, sentence case, not uppercase): Nav links, button text, form labels, footer headings — same face as body, just heavier weight, never mono or tracked-uppercase.

### Named Rules
**The No-Mono Rule.** This system has no monospace voice. Every previous "institutional label" use (nav, buttons, tags, footer headings) now reads in heavy-weight Nunito Sans, sentence case — friendly, not stamped.

**The Hand-Drawn Underline Rule.** `.highlight-purple` / `.purple-word` emphasis words are purple text with a repeating hand-drawn green squiggle underline (SVG background-image) — never italics, never a solid underline. This is the system's one illustrated device; it doesn't extend to mascots, illustrated characters, or decorative collage.

## Layout

The page runs as a stack of full-bleed sections on a cream base, transitioning tonally (cream → purple-tint wash in the hero, deep purple for the features/live-map panel, cream again) rather than being divided by hard ink rules. Content constrains to a centered container; two-column layouts (hero, partner band) collapse to single-column under ~900px, centered on mobile rather than left-aligned. Density is comfortable and airy — generous padding inside rounded cards, generous gaps between list entries, nothing packed tight against a border since there mostly are no hard borders left. Mobile breakpoints step at 900px, 768px, 700px, 600px, and 420px/480px, matching the prior system's tested points.

## Elevation & Depth

Depth is soft and atmospheric — the opposite of the prior hard-shadow system. Every shadow has real blur and a warm color tint (purple or green, matching whatever it's attached to), never a flat offset block. Cards lift gently on hover (`translateY(-2px)` + a deepening shadow), never a press-toward-the-page move.

### Shadow Vocabulary
- **Small** (`box-shadow: 0 4px 16px rgba(124, 92, 191, 0.14)`): Secondary buttons, badges.
- **Medium** (`box-shadow: 0 10px 30px rgba(124, 92, 191, 0.16)`, deepens to `0 14px 34px rgba(124, 92, 191, 0.28)` on hover): Primary CTAs.
- **Warm** (`box-shadow: 0 10px 28px rgba(52, 192, 139, 0.2)`): Reserved for green-accented elements.
- **Ink/Card** (`box-shadow: 0 8px 24px rgba(58, 46, 40, 0.1)`): Content cards, the partner band, video frames.

### Named Rules
**The Soft Shadow Rule.** Every shadow has blur and a warm color tint. A hard-edged, zero-blur, solid-color offset shadow (the prior system's signature) is a bug in this world, not a stylistic choice — the two systems are not compatible and should never mix.

**The Lift-Not-Press Rule.** Interactive hover states lift the element up (`translateY(-2px)`) with a deepening shadow — never a press-toward-the-page translate. This is the friendly-world equivalent of the old system's press-down move, but reads as buoyant rather than mechanical.

## Shapes

**The Rounded-Everything Rule.** `border-radius: 0` is banned in this world — the opposite of the prior system. Buttons are full pills (`999px`); cards, panels, and inputs use 12–28px radius scaled to size. Borders are mostly gone entirely, replaced by shadow and background-color contrast to separate surfaces; where a border remains (form inputs), it's a soft 2px paper-deep line, not ink.

## Components

### Buttons
- **Shape:** Full pill (`border-radius: 999px`), no border.
- **Primary:** Purple fill, white text, heavy-weight Nunito Sans (not uppercase), soft purple-tinted shadow.
- **Hover / Focus:** Lifts `translateY(-2px)`, shadow deepens, fill darkens to purple-deep — see The Lift-Not-Press Rule.
- **Secondary / Ghost:** White fill, purple-tint border, purple-deep text; fills to purple-tint on hover.

### Cards / Containers
- **Corner Style:** 20–28px radius, scaled to the card's size.
- **Background:** White, or purple-tint for cards that need to read as a distinct sub-category.
- **Shadow Strategy:** Ink/Card soft shadow (see Elevation & Depth).
- **Border:** None — separation comes from shadow and background contrast.
- **Internal Padding:** 32–44px for standalone content cards.

### Entry Lists (problem log, procedure list, contact directory)
Where content would otherwise form a same-size icon+heading+text card grid, it's a single flowing list instead — entries separated by a light 1px paper-deep hairline (not the prior system's ink rule), with a rounded purple icon chip or numeral badge leading each row. Numbering (procedure list) is earned only where the sequence is real and order-dependent.

### Inputs / Fields
- **Style:** 2px soft paper-deep border, 20px radius, cream background.
- **Focus:** Border shifts to purple, plus a soft 4px purple-tint glow ring (`box-shadow: 0 0 0 4px purple-tint`) — a glow, not a hard shadow offset.

### Navigation
- Sentence-case, heavy-weight Nunito Sans nav links on cream, no border beneath the bar (a soft shadow separates it instead); active/hover state turns the link purple with a green pill underline. Mobile nav slides in as a full cream panel with a soft shadow, same link treatment stacked vertically.

### Partner Band (signature component)
The "Official Partner" section: a full-width purple-tint band with two tiers, deliberately unequal in weight to keep the relationship chain clear (Check-In → officially partners with → Crime Stoppers of Halton → which itself partners with → OPP/HRPS/CHCH). **Tier 1 (the focus):** a two-column headline (stacks on mobile) — partner label, name, and the real "10,000+" stat badge on the left, the Crime Stoppers of Halton logo standalone and transparent (no card, no background) on the right, sized large (up to 380px). **Tier 2 (subordinate):** a smaller muted "Crime Stoppers of Halton partners with" label, then a static row of only the 3 secondary logos (OPP, HRPS, CHCH) on smaller white tiles — grayscale at rest, full color with a gentle lift on hover. Crime Stoppers never appears in this row — it's already featured above, and repeating it there would blur the hierarchy. An auto-scrolling version of this row was tried and dropped: it never rendered a seamless loop in practice, and a visible snap read worse than static logos — hover is this section's interactive touch instead, since it only moves on direct interaction. No ghost-numeral bleed in this world — the real stat is stated plainly and warmly, not dramatized with an oversized watermark.

## Do's and Don'ts

### Do:
- Round every corner — pills for buttons, 12–28px for everything else.
- Use soft, blurred, warm-tinted shadows for all elevation; deepen on hover, never press toward the page.
- Set every heading in Baloo 2, bold; every UI label and body line in Nunito Sans.
- Mark emphasis words with the hand-drawn green underline, never italics.
- Keep purple as the one color inherited from the product's prior identity.
- Use `green-text` (not plain green) any time green needs to function as readable text.
- Reach for a single hairline-divided entry list instead of a same-size icon+heading+text card grid (see Entry Lists).
- Number a sequence only when order carries real information; parallel/categorical content stays unnumbered.

### Don't:
- Don't use `border-radius: 0` anywhere — that was the prior system, not this one.
- Don't use a hard-edged, zero-blur, solid-color offset shadow — mixing the two shadow languages reads as two different products.
- Don't use a monospace or uppercase-tracked label style anywhere — this system has no mono voice.
- Don't use plain green (`#34C08B`) as text color on a light background — it fails contrast; use `green-text`.
- Don't add mascots, illustrated characters, or a full collage/scrapbook treatment — the hand-drawn underline is the system's one illustrated device, not a license for broader illustration.
- Don't imply the product is a live, usable web app (login CTAs, "open dashboard" language, download/app-store badges) — the mobile app hasn't shipped yet; every CTA on this site is pre-launch interest capture.
- Don't fabricate incident stories, testimonials, or "rescued by Check-In" content — no such real stories exist yet; only the confirmed partnership, the 10,000+ stat, and the real demo video are usable proof points.
