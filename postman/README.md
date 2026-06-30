# Relay — Postman Testing

Import-and-run Postman collection for the Relay API. Covers Phase 3 (auth) and Phase 4
(projects, tasks, comments). The requests chain together with environment variables, so you
register/log in once and everything else reuses the saved token and IDs.

Files in this folder:

- `Relay.postman_collection.json` — all requests, grouped into Health / Auth / Projects / Tasks.
- `Relay.postman_environment.json` — variables (`baseUrl`, tokens, IDs). Import this too.

## 1. Start the stack

```bash
docker compose up -d                       # Postgres + Redis
cd server && npm install && npm run dev    # API on http://localhost:3000
```

## 2. Import into Postman

1. Postman → **Import** (top-left) → drag in **both** JSON files from this folder.
2. Top-right environment dropdown → select **Relay (local)**.

That's it — `{{baseUrl}}` is preset to `http://localhost:3000`.

## 3. Run it

Two ways:

- **One click (smoke test):** right-click the **Relay API** collection → **Run collection** →
  **Run**. It executes top-to-bottom and each request asserts its expected status code, so you get
  a green/red checklist in seconds.
- **By hand (learning):** open requests in order and hit **Send**. Start with **Auth → login Alice**
  (saves `{{token}}`), then **login Bob** (saves `{{bob_token}}` and `{{bob_id}}`), then work down
  Projects and Tasks.

## How the chaining works

Each request has a small **Scripts** (a.k.a. "Tests") snippet that saves values for later requests:

| Request | Saves |
|---|---|
| login Alice | `{{token}}` (the default Bearer token for the whole collection) |
| login Bob | `{{bob_token}}`, `{{bob_id}}` |
| create project | `{{project_id}}` |
| create task | `{{task_id}}` |

You never copy-paste a token. Authorization is set **once** on the collection
(`Bearer {{token}}` = Alice); public requests override to **No Auth**, and the two Bob requests
override to `Bearer {{bob_token}}` to prove that a different member can update a task and comment.

## What the flow demonstrates

1. **Auth** — register/login Alice and Bob, `GET /me`, and a wrong-password **401** (generic message,
   no email enumeration).
2. **Projects** — Alice creates a project (becomes owner), lists/reads/updates it, and adds Bob as a
   member by email.
3. **Tasks** — Alice creates a task assigned to Bob (assignee must be a member), `due_date` round-trips
   as `2026-07-15` with no timezone shift, Bob updates the status to `done` and comments, uploads/lists/
   downloads an **attachment**, then Alice (owner) deletes the task (**204**).

### Attachments (pick a file first)

The Tasks folder includes **POST upload attachment**, **GET list attachments**, and
**GET download attachment**. Upload is `multipart/form-data`: open the request's **Body** tab, click
the **file** row, and **Choose Files** to pick something before sending — don't add a `Content-Type`
header, Postman sets the multipart boundary itself. On success it saves `{{attachment_filename}}`,
which the download request then uses. In the one-click Collection Runner these pass as 201/200 only if
a file is attached; with no file selected they fall back to 400/404 (still green) so the run doesn't
break — attach a file and resend to exercise them for real.

## Trying the negative cases

The happy path runs as-is. To see the guards, tweak a request and resend:

- **403 not a member** — `GET {{baseUrl}}/api/projects/{{project_id}}` with `Bearer {{bob_token}}`
  *before* adding Bob as a member.
- **403 owner-only** — `PUT .../api/projects/{{project_id}}` as Bob (member, not owner).
- **400 bad input** — create a task with `"status": "nope"`, or `"due_date": "15-07-2026"`, or
  assign a non-member.
- **401 no token** — clear `{{token}}` (set it blank in the environment) and call any
  `/api/projects` route.

The full status-code matrix lives in [`../.claude/tests.md`](../.claude/tests.md).

## Notes

- IDs come back as **strings** (Postgres `BIGINT`) — that's expected; the scripts handle it.
- Re-running is safe: register returns **409** the second time and the collection just logs in
  instead; add-member returns **409** if Bob is already in. Both are treated as pass.
