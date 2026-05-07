# Project Analysis: V-Commerce | Rocket Lab 2026.1

## Project Overview
- **Name:** frontend (V-Commerce | Rocket Lab 2026.1)
- **Framework:** React (JSX, Vite)
- **Language:** JavaScript (JSX) — target project uses `.jsx`; incoming code uses TypeScript (`.tsx`)
- **Build tool:** Vite 8.x
- **Package manager:** npm
- **Project ID:** 3DEfWwFw4zy1Vaw0hg8EjMa78oL (locofy.config.json)

## Directory Structure (target project)
```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── locofy.config.json
├── eslint.config.js
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx
    ├── App.jsx          ← default Vite starter (placeholder)
    ├── App.css          ← default Vite starter styles
    ├── index.css        ← global styles (currently Vite defaults)
    └── assets/
        ├── hero.png
        ├── react.svg
        └── vite.svg
```

## Current State
The target project is a **fresh Vite + React scaffold** — still contains the default Vite starter page with a counter, documentation links, etc. No custom screens exist yet.

## Dependencies (target project — package.json)
```json
{
  "react": "^19.2.5",
  "react-dom": "^19.2.5"
}
devDependencies:
  @eslint/js, @types/react, @types/react-dom, @vitejs/plugin-react, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, vite
```

**Missing dependencies** (required by incoming Locofy code):
- `react-router-dom` — for routing (BrowserRouter, Routes, Route)
- `@mui/material` — Material UI components (Box, Typography, etc.)
- `@emotion/react` — MUI peer dependency
- `@emotion/styled` — MUI peer dependency
- `web-vitals` — used by reportWebVitals.tsx

## Incoming Code Overview
**Source:** `.locofy/generated-aIEsN1/`
**Screen count:** 1 screen — `Desktop` (dashboard)
**Language:** TypeScript (TSX) — will be converted to `.tsx` extension when merging

### Incoming File List
**Pages:**
- `src/pages/Desktop.tsx` — main dashboard page

**Components:**
- `src/components/Component6.tsx` + `.module.css` — top-level nav wrapper
- `src/components/FrameComponent11.tsx` + `.module.css` — nav bar inner
- `src/components/FrameComponent.tsx` + `.module.css` — nav pills (Catálogo, Pedidos, Clientes, Tickets)
- `src/components/AvatarLargeIconDefault.tsx` + `.module.css` — user avatar
- `src/components/PieChart.tsx` + `.module.css` — filter button (reusable)
- `src/components/ButtonSmall.tsx` + `.module.css` — small button wrapper
- `src/components/ArrowUpCircle.tsx` + `.module.css` — medium button
- `src/components/ButtonLarge.tsx` + `.module.css` — large button
- `src/components/ButtonIA.tsx` + `.module.css` — AI button
- `src/components/SparkleIconG.tsx` + `.module.css` — sparkle icon for AI button
- `src/components/FrameComponent1.tsx` + `.module.css` — KPI cards row
- `src/components/CardHeader.tsx` + `.module.css` — card header with title/subtitle/description
- `src/components/TendnciasCards.tsx` + `.module.css` — trends bar chart card
- `src/components/Divrounded2xl.tsx` + `.module.css` — NPS segment item (Detratores/Neutros/Promotores)
- `src/components/Container.tsx` + `.module.css` — operations/orders card
- `src/components/LightChipIconFilled.tsx` + `.module.css` — chip/badge component
- `src/components/CircleFilled.tsx` + `.module.css` — legend circle item
- `src/components/TittleInfoLightPopover.tsx` + `.module.css` — quick action item
- `src/components/IconePopover.tsx` + `.module.css` — icon for quick action item

**Root files:**
- `src/App.tsx` — router setup (BrowserRouter not included here — in index.tsx)
- `src/index.tsx` — entry point with MUI ThemeProvider + BrowserRouter
- `src/global.css` — design tokens, CSS variables, Google Fonts
- `src/typings.d.ts` — CSS module type declarations
- `src/reportWebVitals.tsx` — web vitals reporting

**Public assets (SVGs):**
- Alert-triangle.svg, Arrow-Icon.svg, Arrow-Icon1.svg, Arrow-Icon2.svg
- Arrow-right.svg, Arrow-up-circle.svg, Avatar-Large-Icon-Default.svg
- Chevron-down.svg, Circle-Filled.svg, Component-1.svg, Data-Labels.svg
- Download.svg, Feather-Icons-shopping-bag.svg, Group.svg, Group1–7.svg
- Hash.svg, Icon.svg, Icon1.svg, Notfification.svg, Package.svg
- Pie-chart.svg, Search.svg, Shopping-cart.svg, Trend-icon.svg
- Union.svg, Vector.svg, late-package.svg, sparkle.svg, vite.svg

## Navigation Structure
- **No bottom tab bar** — this is a desktop web app
- Navigation is a **top navigation bar** embedded in `Component6`/`FrameComponent11`
- Routing: single route `/` → `Desktop` component

## Design Tokens (from global.css)
Defined as CSS custom properties in `:root`:
- Colors: `--brand-dark-blue` (#020854), `--brand-deep-blue` (#0070db), `--brand-sky-blue` (#08bffd), `--dark2` (#6b7588), `--light4` (#fafafc), `--light5` (#fff), etc.
- Font families: `--font-figtree`, `--font-neue-haas-grotesk-display-pro`
- Gap, padding, border-radius, shadow, gradient variables
- Google Fonts: Neue Haas Grotesk Display Pro, Figtree, Inter, Space Grotesk

## Key Decisions for Merge
1. Target project uses `.jsx` but incoming is `.tsx` — we will use `.tsx`/`.ts` extensions for the new files since the project needs TypeScript support added.
2. `src/App.jsx` and `src/main.jsx` will be replaced/updated.
3. Need to install missing dependencies: react-router-dom, @mui/material, @emotion/react, @emotion/styled.
4. `src/index.css` will be replaced by `src/global.css` content (design tokens).
5. SVG assets go to `public/` folder.
6. `tsconfig.json` needs to be added (none in target).
7. `src/typings.d.ts` needed for CSS module types.
