# Routes

File-based App Router. Root layout: `src/app/layout.tsx` on every page.

| URL | File | What it renders |
| --- | --- | --- |
| / | src/app/page.tsx | Home: fan notice, hero search, faction links, category tiles, popular comparisons |
| /units | src/app/units/page.tsx | Unit browser with filter rail (lg) or filter sheet |
| /units/[slug] | src/app/units/[slug]/page.tsx | Unit detail: stats, armor, penetration, compare |
| /compare | src/app/compare/page.tsx | Side-by-side stat table |
| /research/[faction] | src/app/research/[faction]/page.tsx | Conquest research tree. Nav default germany |
| /factions/[slug] | src/app/factions/[slug]/page.tsx | Faction overview. Nav default germany |
| /patches | src/app/patches/page.tsx | Patch notes |
| /sources | src/app/sources/page.tsx | Sources and credits |
| /about | src/app/about/page.tsx | About |

No router config file. No nested layout.tsx besides the root.
