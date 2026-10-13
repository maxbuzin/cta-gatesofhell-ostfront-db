# Extractable components

## TopBar
- Source: `src/components/layout/top-bar.tsx`
- Category: layout
- Description: Fixed header with logo, wordmark, non-official badge, search, Steam button, and centered faction chips from lg
- Extractable props: activeItem (string, default: "home")
- Hardcoded: OSTFRONT DB wordmark, Non-official website badge, Buy on Steam label and URL, /logo.webp, faction names Germany USSR USA British Commonwealth, search placeholder

## DesktopSidebar
- Source: `src/components/layout/desktop-sidebar.tsx`
- Category: layout
- Description: Fixed left navigation rail, 14rem, from md up
- Extractable props: activeItem (string, default: "home"), compareCount (number, default: 0)
- Hardcoded: Home, Units, Compare, Research Tree, Factions, Patch Notes, Sources & Credits, About labels and icons

## SiteFooter
- Source: `src/components/layout/site-footer.tsx`
- Category: layout
- Description: Meta footer with logo, game version, license, trademark
- Extractable props: gameVersion (string, default: "1.061.0")
- Hardcoded: /logo.webp, affiliation sentence, CC BY-SA, MIT, trademark paragraph, maxbuzin link

## BrandLogo
- Source: `src/components/layout/brand-logo.tsx`
- Category: layout
- Description: 32px wordmark image
- Extractable props: none
- Hardcoded: /logo.webp, size-8

## FactionChips
- Source: `src/components/layout/faction-chips.tsx`
- Category: layout
- Description: Four faction filter links
- Extractable props: size (string, default: "sm")
- Hardcoded: Germany #5E6B73, USSR #B23A2F, USA #4A6B3A, British Commonwealth #A8834A, hrefs /units?faction=

## CompareTray
- Source: `src/components/compare/compare-tray.tsx`
- Category: layout
- Description: Fixed bottom bar of units queued for compare
- Extractable props: compareCount (number, default: 2)
- Hardcoded: Compare label, Clear, Compare button, chip chrome

## MobileNav
- Source: `src/components/layout/mobile-nav.tsx`
- Category: layout
- Description: Hamburger sheet with the same nav as the sidebar
- Extractable props: activeItem (string, default: "home")
- Hardcoded: OSTFRONT DB sheet title, menu icon

Skip Button, Input, Badge, Sheet as inline HTML. They are too generic to extract.
