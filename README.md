# Primary WMS

Single-organization inventory system (Sortly equivalent) for **The Primary Group**.  
Default product name: **Primary WMS**. Default accent: **sea green** `#2E8B57`.

## Stack

- Next.js 16 (App Router) + Tailwind CSS + TypeScript
- PostgreSQL + Prisma
- Email/password auth (argon2, httpOnly session). No Google/Apple/SSO.
- pnpm workspaces: `apps/web`, `apps/mobile` (later), `packages/db`, `packages/shared`

## Run locally

1. Start Postgres:

```bash
docker compose up -d db
```

2. Install and migrate:

```bash
pnpm install
pnpm db:generate
pnpm db:push
```

3. Start the web app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit is the **setup wizard** — that creates the organization, Super Admin, All Items folder, Primary custom fields, units, and transaction reasons.

Postgres is published on **127.0.0.1:55432** (to avoid a local Postgres already using 5432).

Default accent on setup is sea green (`#2E8B57`). You can change it under Settings → Company Details.

## What this first slice includes

- Setup wizard + email/password login, forgot password, invites
- Super Admin / Admin / Team Member / Scanner roles and folder View/Edit ACL
- Items workspace: folder tree, grid/list/table, search, pagination, group items
- Add item / add folder, item detail, photos
- Quantity update and move (immutable transactions, row-locked)
- Clone, soft-delete / Trash
- Dashboard, tags, advanced search, reports hub, notifications
- Settings: profile, preferences, company (incl. color), team, custom fields, units, reasons, feature controls

## Shared files (Supabase)

Item photos and PDFs can be stored in **Supabase Storage** and shared with a public link (no login required).

1. Create a project at [supabase.com](https://supabase.com).
2. In **Settings → API**, copy the project URL and the **service role** key.
3. Add them to `apps/web/.env` (and restart `pnpm dev`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=primarywms
```

The app creates a public bucket named `primarywms` on first upload if you set the **service role** key. With only the anon key, create the bucket once in the dashboard (or run `docs/supabase-storage.sql`).

- Upload a photo on an item → **Copy share link**
- Settings → **Shared files (images & PDFs)** → upload a PDF or image → link is copied

Anyone with `/share/{token}` can open the file. Do not put the service role key in client-side code.

## Not in this slice yet (still specified in `docs/REQUIREMENTS.md`)

- CSV/XLSX import-export and label PDFs
- Expo mobile + offline sync
- Phase 2 workflows (jobs, POs, pick lists, stock counts)

## Docs

- `docs/REQUIREMENTS.md` — source of truth
- `docs/SORTLY-LIVE-UI.md` — live UI to match
- `docs/DATA-MODEL.md` — export columns → Postgres
