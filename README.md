# SOT — Source of Truth

A documentation hub for product builds: projects and sub-projects, teams with roles, folders for files, notes and links,
role/department-based access, connectors and AI answers that respect access.

## Run it locally

```bash
npm install
npx prisma db push      # creates prisma/dev.db (SQLite)
npm run db:seed         # optional demo workspace
npm run dev             # http://localhost:3100
```

Copy `.env.example` to `.env` first and set `SESSION_SECRET`. Add `ANTHROPIC_API_KEY` to switch on **Ask AI**.

Demo accounts (after `npm run db:seed`), password `sot-demo-2026`:

| Email | Who | Project role | Sees Budget folder? |
| --- | --- | --- | --- |
| ada@demo.sot | Product manager, workspace owner | Owner | Yes (creator) |
| tunde@demo.sot | Engineer | Editor | No |
| mira@demo.sot | Designer | Contributor | No |
| funmi@demo.sot | Finance | Viewer | Yes (Finance department) |

## How access works

- `lib/access-core.ts` holds the rules as pure functions; `npm test` runs them.
- Project roles: Owner, Editor, Contributor, Viewer. Sub-projects inherit the nearest parent's role; guests never inherit.
- A restricted folder is visible only to its creator and to people or departments on its allow list. Workspace
  admins do not bypass it. Restricted folders are excluded from sidebar counts, search, file downloads and AI context.

## Structure

- `app/` — landing, auth, onboarding (`/onboarding`), the app (`/app/...`) and the protected file route (`/api/files`)
- `app/app/actions.ts` — every write, each re-checking permissions on the server
- `lib/` — session (JWT cookie), permission service, connector catalogue, AI (`claude-opus-5-5`)
- `prisma/schema.prisma` — SQLite for dev; switch `provider` to `postgresql` for production

## Not done yet

- OAuth sync for connectors (links are detected and tagged today; "Connect" records intent only)
- Email invites, SSO, password reset
- File storage is local disk (`uploads/`); move to S3/R2 for production
- Usage metering / AI credits (see the pricing discussion in the plan)
