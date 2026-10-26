# Agent rules for UII-web

These rules apply to every agent working in this repository. They are listed in order of priority. When a rule here conflicts with what you remember, the rule wins.

## 1. Treat what you already know as wrong until verified

- Assume your memory of any library, framework, CLI, API or standard is **outdated or wrong**. Before you rely on it (an API, a config key, a CLI flag, a default value, a version-specific behaviour), confirm it against an **official source**.
- Official sources, in this order:
  1. The docs shipped with the installed package, which match the exact installed version. For Next.js this is `node_modules/next/dist/docs/` (see the block at the end of this file).
  2. The project's official documentation site or official repository: nextjs.org, react.dev, supabase.com/docs, authjs.dev, zod.dev, tailwindcss.com, maplibre.org, nodemailer.com, developers.google.com, developer.android.com, conventionalcommits.org, github.com/Fission-AI/OpenSpec.
- Blog posts, Q&A sites, tutorials and AI-generated text are **not** official sources. You may use them to find a lead, then confirm the lead in an official source.
- Check that the source matches the version **installed here** (section 2), not the latest version.
- When a verified fact drives a decision, cite the source (URL or `node_modules` path) in the spec's `design.md` or in the commit body.
- If you cannot verify something, say so plainly and do not act on it as if it were true.

## 2. Repository facts

Verified on 2026-10-21 from `package.json`, `node_modules/*/package.json`, `Dockerfile`, `docker-compose.yml` and `git`. This section can go stale: if it disagrees with those files, **the files win**. Update this section in the same change that bumps a version.

### This repository

| Item | Value |
|------|-------|
| Name | `uii-web` 0.1.0 (private): the web app of **Seize Guard / UII**, an SOS and health-monitoring platform for people living with epilepsy and their circle of family and carers |
| Remote | `https://github.com/Hiulaptop/UII-web.git`, default branch `main` |
| Production URL | `https://uii.studev.net` (used by the watch release build) |
| Design system | `../DESIGN.md`. It sits in the parent folder `D:\UII`, **outside this git repo**. |

### Toolchain and runtime

| Tool | Version |
|------|---------|
| Node.js | 24 (`node:24-alpine` in `Dockerfile`; local dev 24.15.0) |
| npm | 11.12.1 (local) |
| TypeScript | 5.9.3 installed (`^5`) |
| ESLint | 9.39.5 installed (`^9`), config `eslint-config-next` 16.3.7 |

### Dependencies (installed version, with the declared range in brackets)

| Package | Version |
|---------|---------|
| next | **16.3.7** (pinned): non-standard, read the bundled docs first |
| react / react-dom | **19.2.8** (pinned) |
| @supabase/supabase-js | 2.117.2 (`^2.117.2`) |
| @supabase/ssr | 0.12.7 (`^0.12.7`) |
| next-auth | **5.0.0-beta.32** (`^5.0.0-beta.32`, a beta) |
| zod | 4.6.5 (`^4.6.5`) |
| tailwindcss | 4.3.3 (`^4`, configured through `@tailwindcss/postcss`) |
| shadcn / @base-ui/react | 4.21.0 / 1.8.0 |
| maplibre-gl / pmtiles | 6.15.0 / 4.5.0 |
| gsap / @gsap/react | 3.15.0 / 2.1.2 (exact; standard no-charge license) |
| lenis | 1.3.26 (exact) |
| three / @types/three | 0.186.1 / 0.186.0 (exact) |
| nodemailer | 8.0.11 |
| googleapis | 182.0.0 |
| zustand | 5.0.15 |

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (also rewrites the Next.js block below) |
| `npm run build` / `npm start` | Production build (`output: "standalone"`) / start |
| `npm run lint` | ESLint |
| `npm test` | `node --test tests/*.test.mjs` (Node's built-in runner; the tests import `.ts` files directly) |
| `npm run watch-sim` | Simulate a paired watch against the device API (`scripts/watch-sim.mjs`) |
| `docker compose up -d --build` | Run `web` plus `tunnel` (Cloudflare Tunnel; needs `TUNNEL_TOKEN`) |

### Layout

- `src/app/`: App Router pages and route handlers.
  - The device API that the watch calls lives in `src/app/api/device/{pair,unpair,samples,alerts,alerts/location,sos-card}`.
  - The live-update stream is `src/app/api/events`.
- `src/lib/`: domain logic by area: `account`, `device`, `notify`, `sos`, `medication`, `google`, `reports`, `supabase`, plus `alerts.ts`, `dashboard.ts`, `invites.ts`.
- `src/components/`: UI by area; shared primitives are in `src/components/ui`.
- `supabase/migrations/`: numbered SQL migrations, currently `0001`–`0007`. There is also `seed-demo.sql`, and `apply-0004-0006.sql` (a combined script).
- `tests/`: `node:test` suites. `docs/`: operator docs (for example `map-tiles.md`).
- Environment: `.env` is ignored by git; `.env.example` lists the variable names. Never commit real values.

### Paired project: UII-watch

- Repo `git@github.com:Hiulaptop/UII-watch.git`, checked out at `../UII-watch`.
  - `../_watch-master` is a git worktree of the same repo, not a separate project.
- A Wear OS app: application id `net.studev.uii`, minSdk 34, targetSdk 37, Java 17 + Kotlin 2.2.10, AGP 9.4.0, Wear Compose 1.7.0.
- It talks to this repo **only** through the device API. The Zod schemas in `src/lib/device/schemas.ts` are the contract.
- The watch repo already uses OpenSpec (`openspec/`, `schema: spec-driven`).

## 3. Large or schema changes go through spec-driven development, approved before any code

**A change needs a spec when** it does any of the following:
- Touches the **database schema**: a new or changed migration, table, column, enum, index, RLS policy, function or trigger.
- Touches a **contract other code depends on**: the Zod schemas in `src/lib/device/` or `src/lib/sos/`, any device API request or response, or event payloads.
- Is **large**: a new feature or page, a change across several areas, auth/session behaviour, or how health, location or other personal data is collected, kept or shown.

**Process** (OpenSpec, the same tool and layout as UII-watch, verified at github.com/Fission-AI/OpenSpec):
1. If `openspec/` does not exist yet, set it up with `openspec init`. OpenSpec needs Node ≥ 20.19, which this repo's Node 24 meets. Use `schema: spec-driven` in `openspec/config.yaml`.
2. Create `openspec/changes/<change-name>/` with:
   - `proposal.md`: why, what changes, impact.
   - `design.md`: decisions with the cited sources from rule 1, migration and rollback plan, data/privacy impact.
   - `specs/`: requirements with `#### Scenario:` WHEN/THEN.
   - `tasks.md`.
3. **Stop and ask the user to approve the spec.** Approval must be an explicit yes from the user in the conversation. An earlier approval does not cover a new or revised spec. Until then, write no code and no migration file.
4. After approval, implement exactly what `tasks.md` says. If the work turns out to need something the spec does not cover, stop, update the spec, and get approval again.
5. Migrations:
   - Add a new file with the next number (`0008_…`).
   - **Never edit a migration that may already be applied.**
   - Every schema change states its rollback.
6. If a device API contract changes, the matching change in UII-watch needs its own approved spec. Ship the two so that an old watch keeps working, or say explicitly that it will not.
7. When the work is done and verified, archive the change (`openspec/changes/archive/<date>-<change-name>/`) and update `openspec/specs/`.

Small, local changes need no spec: a bug fix inside one module, copy edits, tests, dependency patch bumps. They still follow rules 1, 4 and 5.

## 4. Draw every UI change first, then build exactly what was drawn

1. Before changing any UI, produce a drawing of the result, such as an HTML mockup, an SVG or a PNG wireframe.
   - Save it in the spec folder (`openspec/changes/<change-name>/ui/`), or in `docs/ui/<change-name>/` when the change has no spec.
2. The drawing covers every screen and state the change touches:
   - desktop and mobile widths;
   - default, hover/focus, loading, empty and error states;
   - real copy text, not lorem ipsum.
   It follows `../DESIGN.md` (colors, type, spacing, logo, accessibility rules).
3. **Show the drawing to the user and wait for explicit approval** before writing UI code.
4. Build **exactly** what was approved: same layout, components, copy, colors, spacing and states. Add nothing and leave nothing out.
   - If the implementation must differ (a technical limit, a missing component), update the drawing first and get approval again. Never silently diverge.
5. When done, take screenshots of the built UI at the same widths and compare them with the drawing. Report every difference to the user.

## 5. Git commits follow Conventional Commits 1.0.0

Spec: https://www.conventionalcommits.org/en/v1.0.0/ (verified 2026-10-21).

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

**From the spec:**
- `feat` is used for a new feature (SemVer MINOR) and `fix` for a bug fix (PATCH).
- Other allowed types: `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `revert`.
- The scope is a noun in parentheses. The description comes right after `: `.
- The body comes after one blank line and explains what changed and why.
- Footers come after one blank line in `Token: value` form. Tokens use `-` instead of spaces (`Refs: #12`, `Reviewed-by: …`).
- A breaking change is marked with `!` before the colon, a `BREAKING CHANGE: <description>` footer (uppercase), or both.
  - Any incompatible change to the database schema or the device API is a breaking change and must be marked.

**Conventions of this repo** (taken from its history):
- English. The description is lowercase, imperative, and has no trailing period: `feat(device): add watch SOS card endpoint`.
- Keep the header line at 72 characters or fewer.
- Scopes used so far: `circle`, `dashboard`, `db`, `device`, `devices`, `medication`, `notify`, `privacy`, `reports`, `settings`, `sos`. Reuse one before inventing a new one.
- For OpenSpec work:
  - A spec-only commit uses `docs(spec): propose <change-name>`.
  - Implementation commits use the area's own type and scope.
  - Archiving uses `docs(spec): archive <change-name>`.
- One logical change per commit. A migration and the code that needs it go in the same commit, so every commit builds and runs.

**Always:**
- Commit only when the user asks.
- Never commit `.env`, keys, tokens or the release keystore.
- Never skip hooks (`--no-verify`) or rewrite pushed history unless the user explicitly asks.
- Before committing, run `npm run lint` and `npm test` and report any failure honestly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
