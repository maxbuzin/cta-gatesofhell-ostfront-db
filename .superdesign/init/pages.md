# Page dependency trees

Shell on every route: `src/app/layout.tsx`
- src/components/layout/chrome-bar.tsx
- src/components/layout/top-bar.tsx
  - src/components/search/command-search.tsx
    - src/components/ui/command.tsx
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
  - src/components/layout/mobile-nav.tsx
    - src/components/ui/sheet.tsx
    - src/components/layout/sidebar-nav.tsx
      - src/components/layout/nav-items.ts
      - src/lib/compare-store.tsx
      - src/components/ui/badge.tsx
  - src/components/layout/faction-chips.tsx
    - src/lib/factions.ts
    - src/lib/safe-css-color.ts
  - src/components/layout/brand-logo.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/button.tsx
- src/components/layout/desktop-sidebar.tsx
  - src/components/ui/scroll-area.tsx
  - src/components/layout/sidebar-nav.tsx
- src/components/layout/site-footer.tsx
  - src/components/layout/brand-logo.tsx
- src/components/compare/compare-tray.tsx
  - src/lib/compare-store.tsx
  - src/components/ui/button.tsx

## / (Home)
Entry: `src/app/page.tsx`
Dependencies:
- src/components/units/empty-state.tsx
- src/lib/factions.ts
- src/lib/safe-css-color.ts
- src/components/layout/faction-chips.tsx
- src/components/home/fan-notice.tsx
- src/components/home/home-search.tsx
  - src/components/ui/input.tsx
  - src/components/ui/button.tsx
- src/lib/db/queries/units.ts
- src/lib/safe-query.ts

Renders a fan notice, centered hero (title, search, faction links), category tile grid, popular comparisons.

## /units
Entry: `src/app/units/page.tsx`
Dependencies:
- src/components/units/units-browse.tsx
  - src/components/ui/button.tsx
  - src/components/ui/sheet.tsx
  - src/components/units/filter-panel.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/label.tsx
    - src/components/ui/input.tsx
    - src/components/ui/button.tsx
    - src/components/ui/scroll-area.tsx
    - src/lib/factions.ts
    - src/lib/safe-css-color.ts
- src/components/units/units-view.tsx
  - src/components/ui/button.tsx
  - src/components/units/empty-state.tsx
  - src/components/units/unit-card.tsx
    - src/components/units/faction-badge.tsx
    - src/components/units/add-compare-button.tsx
- src/components/units/color-legend.tsx
- src/components/edit/add-new.tsx
- src/components/ui/skeleton.tsx

Desktop (lg): title row plus fixed right filter rail (`data-right-rail`, w-80). Below lg: Filters button opens a right sheet. List is unit cards.

## /compare
Entry: `src/app/compare/page.tsx`
Dependencies:
- src/components/compare/compare-table.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/label.tsx
  - src/components/units/stat-cell.tsx
  - src/components/units/unit-silhouette.tsx
  - src/lib/stats/definitions.ts
- src/components/compare/compare-controls.tsx
- src/components/units/penetration-chart.tsx
- src/components/units/empty-state.tsx
- src/components/units/color-legend.tsx
- src/components/ui/skeleton.tsx

## /units/[slug]
Entry: `src/app/units/[slug]/page.tsx`
Dependencies:
- src/components/units/copy-link-button.tsx
- src/components/units/add-compare-button.tsx
- src/components/units/faction-badge.tsx
- src/components/units/specialty-badge.tsx
- src/components/units/cost-chips.tsx
- src/components/units/stat-cell.tsx
- src/components/units/unit-silhouette.tsx
- src/components/units/armor-diagram.tsx
- src/components/units/penetration-chart.tsx
- src/components/units/empty-state.tsx
- src/components/units/color-legend.tsx
- src/components/ui/tabs.tsx
- src/components/ui/skeleton.tsx
- src/components/edit/inline-edit.tsx

## /research/[faction]
Entry: `src/app/research/[faction]/page.tsx`
Dependencies:
- src/components/research/research-tree-client.tsx
  - src/components/research/research-tree-canvas.tsx
- src/components/edit/add-new.tsx
- src/components/ui/skeleton.tsx
- src/lib/factions.ts

## /factions/[slug]
Entry: `src/app/factions/[slug]/page.tsx`
Dependencies:
- src/components/units/empty-state.tsx
- src/components/factions/faction-chart.tsx
- src/components/ui/skeleton.tsx
- src/lib/factions.ts

## /patches
Entry: `src/app/patches/page.tsx`
Dependencies:
- src/components/units/empty-state.tsx

## /sources
Entry: `src/app/sources/page.tsx`
Dependencies:
- src/components/units/empty-state.tsx
- src/components/ui/button.tsx

## /about
Entry: `src/app/about/page.tsx`
Static copy page. No local UI imports beyond the root shell.
