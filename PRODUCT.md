# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

This repo is the marketing website (root `index.html` + `pages/`) promoting Check-In. The product it promotes is a native mobile app (iOS/Android) launching later summer 2026, not a web app.

## Stack

Vanilla HTML/CSS/JS (no framework). Root `styles.css` is the legacy stylesheet; `redesign.css` is the active editorial/brutalist redesign layer loaded after it on most pages. Firebase Functions + MongoDB backend lives in `backend/`, used for auth, newsletter (Beehiiv), and email.

## Users

Primary: everyday residents of Halton (Greater Toronto Area) who want real-time safety alerts, an incident map, and a way to stay connected with neighbors.

Secondary: volunteer moderators who review and manage incident reports and community chat (see `pages/moderator/moderator-home.html`).

## Product Purpose

Check-In is a community safety app: residents place real-time safety "pings" on a live neighborhood map, get instant alerts, chat with neighbors, and file detailed incident reports (photos/video/audio) with smart priority classification. Success is a community that feels safe, connected, and informed instead of relying on fragmented, unreliable channels.

## Positioning

Verified local partnership + unified platform: Check-In is the official app of Crime Stoppers of Halton, which itself partners with the Ontario Provincial Police, Halton Regional Police Service, and CHCH-TV. It consolidates safety alerts, live incident mapping, group chat, and reporting into one app - functions that competitors leave scattered across separate platforms. A copycat app could not truthfully claim the Crime Stoppers of Halton backing or the associated police/media partnerships.

## Operating Context

- **Marketing site is live now; scope of active work is the 4 marketing pages**: `index.html` (root) plus `pages/info/how-it-works.html`, `pages/info/about-us.html`, and `pages/info/contact.html`. These are the pages `redesign.css` itself is scoped to (via `body.ci-redesign`). The rest of `pages/` (dashboard, moderator, neighborhood, auth) reflects a deprecated web-app version of the product and is not being promoted or actively designed going forward - do not imply the product is usable in-browser today.
- The mobile app itself is not yet shipped (launching later summer 2026, targeting 10,000+ people in Halton first). The site should message around the upcoming mobile app, not a live web dashboard.
- Region/audience is Halton, Ontario (GTA) specifically, not a generic "anywhere" community app - copy references Halton and GTA by name.
- A YouTube demo video and app-screenshot mockups (iPhone frame) currently stand in for real product access since there's no live download yet.

## Capabilities and Constraints

- Core app capabilities (per marketing copy): one-tap GPS-precise safety pings, live map updates, community-wide push-style alerts, real-time group chat with photo/location sharing, incident reports with photo/video/audio evidence and priority classification, notification center.
- Newsletter signup (Beehiiv-backed) is a real, functioning capture mechanism on the current site and should stay functional through any redesign.
- "Download" / app-store links are intentionally commented out sitewide - there is no app to download yet. Do not add live store badges until the user confirms the app has shipped.
- No native app store presence exists today; all "get the app" CTAs are pre-launch interest capture (newsletter/contact), not installs.

## Brand Commitments

- Name: **Check-In**. Tagline direction: "Your neighborhood, looking out." Purple is the established brand accent color (used across CTAs, highlights, partner band).
- Official Partner: **Crime Stoppers of Halton**, which partners with OPP, Halton Regional Police Service, and CHCH-TV - these partner logos/names are real and load-bearing, not placeholder.
- Contact: team@thecheckin.ca, 416-786-8163. Social: X @thecheckin_ca, Instagram @thecheckin.ca.

## Evidence on Hand

- Real partner logos in `pages/assets/partners/` (Crime Stoppers of Halton, OPP, HRPS, CHCH-TV) - usable as-is.
- Real stat: "10,000+ people in Halton will receive Check-In this summer" - usable, do not alter the number or timeframe without confirmation.
- Real YouTube product demo (`youtube.com/embed/zyq9GzMlA7s`) and app screenshot mockups in `pages/assets/`.
- No testimonials, press mentions, or case studies exist yet - do not fabricate any.

## Product Principles

1. Lead with the Crime Stoppers of Halton partnership and its police/media backing - it's the hardest-to-copy proof point.
2. Speak to Halton/GTA residents specifically; keep geography concrete rather than generic "your community."
3. Sell the upcoming mobile app, not a live web product - every CTA is pre-launch interest, not "log in" or "open dashboard."
4. Keep the newsletter capture path (Beehiiv) functional through any visual changes; it's the one live conversion mechanism pre-launch.
5. Treat everything outside the 4 marketing pages (dashboard, moderator, neighborhood, auth pages) as deprecated legacy, not a surface to extend.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond standard web accessibility practice.
