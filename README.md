# Mondelos Nature Park

Website for Mondelos Nature Park in Kawayan, Biliran, Philippines. A statically prerendered single-page app built with React Router v8 (framework mode, `ssr: false`), Tailwind CSS 4 and Supabase.

## Prerequisites

- Node.js (current LTS) and npm
- Docker, for the local Supabase stack (`supabase start`)

## Setup

```sh
npm install
cp .env.example .env         # then fill in the two VITE_SUPABASE_* values
```

## Scripts

| Script                 | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the dev server                            |
| `npm run build`        | Build the static site into `build/client`       |
| `npm run typecheck`    | Generate route types, then run `tsc --noEmit`   |
| `npm run lint`         | Run ESLint                                      |
| `npm run format`       | Format the repo with Prettier                   |
| `npm run format:check` | Check formatting without writing                |
| `npm test`             | Run the Vitest suite once                       |
| `npm run test:watch`   | Run Vitest in watch mode                        |
| `npm run test:db`      | Run pgTAP database tests (needs local Supabase) |
