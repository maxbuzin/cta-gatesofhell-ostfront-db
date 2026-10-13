# Ostfront DB design system

Free unit database for Call to Arms – Gates of Hell: Ostfront. Players search units, compare stats, and open Conquest research trees. Mode: Operate. Dark field manual, not a marketing site.

## Identity

Keep these. Do not invent fonts, colors, or styles outside this file.

- Ground `#121410` (`background`)
- Surface / card / sidebar `#1b1e18`
- Text `#e6e4dc`
- Muted text `#9a9888`
- Olive primary `#7a8b5c`, text on primary `#121410`
- Brass accent `#b89a55` (non-official badge, links of emphasis)
- Borders and inputs `#2c3127`
- Destructive `#c0443a`
- Faction swatches: Germany `#5E6B73`, USSR `#B23A2F`, USA `#4A6B3A`, British Commonwealth `#A8834A`
- Stat colors: green `#6a9a6a`, yellow `#d4b84a`, red `#d05a50`, pink `#d07a9a`, blue `#5a8fc4`, gray `#8a8a8a`, purple `#9a7aab`

Fonts:

- Body and UI: Syne Mono
- Stats and numbers: JetBrains Mono, tabular nums
- Display wordmark only: Black Ops One, tracking wide, used for "OSTFRONT DB" and the home title

Radius 6px (`0.375rem`). Borders 1px `#2c3127`. Shadows only `shadow-xs` on controls and `shadow-lg` on sheets.

Logo: `/logo.webp`, 32px in the header, 40px in the footer. Always the image, never initials or a substitute mark. Wordmark text sits beside it.

## Layout

- Header height 56px plus safe-area top. Fixed.
- Left rail 224px (`14rem`) from 768px. Hidden below, replaced by a left sheet.
- Right filter rail 320px (`20rem`) only on `/units` from 1024px.
- Compare tray fixed to the bottom when items are queued.
- Content inset 12px below md, 24px from md. Footer and tray use the same inset, plus the rail offsets.
- Page sections: 12px inside a group, 32px between groups. Footer gap above is 48px, padding inside the footer is 16px.
- Touch targets at least 44px on coarse pointers for real controls. Do not force 44px on tiny chips inside a 56px bar.

## Components

- Button default: olive fill, dark text, height 36px. xs height 24px for Steam. ghost for icons. outline for secondary.
- Badge outline, brass text, 10px tracking-widest uppercase for "Non-official website".
- Inputs: 36px, border `#2c3127`, background `input/30`, placeholder muted.
- Nav row: 8px vertical padding, 12px horizontal, radius 6px. Active: primary at 20% fill, foreground text. Idle: muted text, hover muted fill.
- Faction chip: 1px border, 2px color square, 11px label when in chrome, 14px on the home hero.

## Motion

150ms color and opacity. No entrance choreography. Respect reduced motion.

## Copy that must stay

- Wordmark: OSTFRONT DB
- Badge: Non-official website
- Steam button: Buy on Steam
- Search placeholder: Search units... (Ctrl+K)
- Footer: not affiliated with Barbedwire Studios / 1C Entertainment / Digitalmindsoft
- Home line: Turbo spreadsheet for Call to Arms – Gates of Hell: Ostfront.

## Fidelity

Use ONLY the fonts, colors, spacing, and component styles defined in this design system. Do not introduce any fonts, colors, or visual styles not in the design system.
