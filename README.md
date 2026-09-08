# ln-web

Next.js web client for LectureNote AI. Talks to [`ln-backend`](../ln-backend);
it holds no business logic of its own.

Setup and how to run: **[../SETUP.md](../SETUP.md)**.
Deploying it free: **[../DEPLOYMENT.md](../DEPLOYMENT.md)**.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server Components keep tokens off the client |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS 4 | Same utility model as the old frontend, so components port across |
| Forms | react-hook-form + Zod | Uncontrolled inputs, one schema shared with the server |
| Server state | TanStack Query | For client-fetched data once features land |
| Tests | Vitest + Testing Library | |
| Format / lint | Prettier + ESLint | |

## How auth works

The browser **never sees a token**. It cannot read one, so it cannot leak one.

```
browser  ──POST /api/auth/login──▶  Next route handler
                                        │
                                        ├─▶ POST {API_BASE_URL}/auth/login
                                        │◀── { access_token, refresh_token }
                                        │
                                    sets httpOnly cookies
browser  ◀──── user profile ────────────┘   (no tokens in the body)
```

- `ln_access` — 15 minutes, mirrors the backend's access-token TTL.
- `ln_refresh` — 30 days.

Both are `httpOnly`, `sameSite=lax`, and `secure` outside development.

Three layers guard a page, and only the third is real enforcement:

1. **`src/middleware.ts`** — checks a refresh cookie *exists*. No network call,
   no signature check; it runs on every request so it must stay cheap. Its only
   job is to stop a signed-out visitor seeing a dashboard flash before a
   redirect.
2. **`src/app/(app)/layout.tsx`** — calls `/users/me`. A forged or revoked
   cookie fails here.
3. **The backend** — rejects any request without a valid token. This is the
   control; the other two are user experience.

**Token refresh.** Server Components can read cookies but not write them, so
they cannot refresh an expired token. `<SessionKeeper />` runs on the client and
renews the access cookie a minute before it lapses, so server renders reliably
find a valid token. If the refresh fails — expired, or revoked by the backend's
reuse detection — it redirects to `/login`.

## Layout

```
src/
├── app/
│   ├── (auth)/            Signed-out pages, centred card shell
│   │   ├── login/
│   │   └── register/
│   ├── (app)/             Signed-in pages; layout enforces the session
│   │   └── dashboard/
│   ├── api/auth/          Route handlers — the only code that writes cookies
│   │   └── login/  register/  refresh/  logout/
│   └── layout.tsx
├── components/
│   ├── auth/              Forms, SessionKeeper, SignOutButton
│   └── ui/                Button, Field, Alert
├── lib/
│   ├── api/               fetch wrapper + backend types
│   ├── auth/              Cookie helpers, current-user lookup
│   ├── validation/        Zod schemas shared by forms and route handlers
│   ├── env.ts             Validated environment access
│   └── utils.ts           cn()
└── middleware.ts
```

Route groups `(auth)` and `(app)` do not appear in URLs — they exist so each set
of pages gets its own layout, and so the session check lives in exactly one
place rather than being repeated per page.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest once |
| `npm run test:watch` | Watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `API_BASE_URL` | yes | Backend base URL **including** `/api/v1`. Server-only — deliberately not `NEXT_PUBLIC_`, because the browser must never call the backend directly |

## Conventions

- **Server Components by default.** Add `"use client"` only for interactivity —
  forms, timers, event handlers.
- **Validation is defined once** in `src/lib/validation/` and used by both the
  form and the route handler. Client-side validation is a convenience; the route
  handler validates independently, and the backend validates again.
- **Only route handlers write cookies.** Server Components read.
- **Errors use the backend envelope** — `{ error: { code, message } }` — so one
  parser handles every failure.

## Porting UI from the old frontend

The old app is also React + Tailwind, so components move across with modest
changes:

- `react-router-dom` → App Router file conventions.
- Firebase SDK calls → `fetch` to the backend.
- `useState` data fetching → Server Components, or TanStack Query where the data
  is client-driven.

Design tokens to preserve (Inter and Kalam fonts, the slate/blue palette) are
listed in [../docs/PROGRESS.md](../docs/PROGRESS.md).

## Two gotchas

**`AGENTS.md` and `CLAUDE.md` regenerate.** `next dev` rewrites them on every
run. They are gitignored, so ignore them.

**`POST` from `curl` returns 404.** Next 16 rejects cross-origin POSTs to route
handlers without a matching `Origin` header — built-in CSRF protection. Browsers
always send it; `curl` does not. Add `-H "Origin: http://localhost:3000"` when
testing by hand.

## Status

Auth, classrooms and notes are complete: **46 tests** passing, ESLint clean,
`tsc` clean, production build succeeds. The dashboard and classroom pages were
verified rendering real data against the running backend.

Materials and assignments are next — see
[../docs/PROGRESS.md](../docs/PROGRESS.md).
