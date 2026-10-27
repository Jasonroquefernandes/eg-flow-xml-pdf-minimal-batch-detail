# EG Flow — XML/PDF invoice batches

A Next.js prototype of the EG Flow UI for invoice batches: upload, review, dispatch, and recovery of failed batches and invoices. All state lives in the browser (`localStorage`) and the batches are seeded demo data, so no backend or environment variables are needed.

## Requirements

- Node.js 20.9 or newer (22 recommended; `.nvmrc` is included, so `nvm use` works)
- npm (ships with Node)

## Getting started

```bash
git clone https://github.com/Jasonroquefernandes/eg-flow-xml-pdf-minimal-batch-detail.git
cd eg-flow-xml-pdf-minimal-batch-detail
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run lint` | Run ESLint |

## Project layout

- `src/app` — routes (batches, organizations, settings, profile, login, preview)
- `src/components` — UI components
- `src/lib` — data and shared logic
- `public/samples` — sample invoice HTML, CSS and email templates
- `docs/failed-batch-flow.md` — how failed batches are handled
- `EG Flow — Product, UX & Application Design Brief.md` — product and UX brief

## Notes

This project uses a recent Next.js version with breaking changes from older releases. See `AGENTS.md` and the docs in `node_modules/next/dist/docs/` before changing framework-level code.
