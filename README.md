# Jacaranda City · Accessible City Events & Services Portal

A civic events portal for Pretoria (City of Tshwane), the "Jacaranda City". Residents find events, listen to audio announcements, watch promo videos and get notifications. City admins publish and manage all of it.

Built for the ALU Advanced Front-End Development summative ("CivicEvents"). The frontend is HTML + Tailwind CSS + jQuery, talking to the provided Node/Express + PostgreSQL API.

| Folder | What it is |
|---|---|
| `backend/` | Provided API (Express, PostgreSQL). Runs on **http://localhost:4000** |
| `frontend/` | My UI. Served on **http://localhost:5500** |
| `video-demo/` | Demo video link |

---

## Prerequisites

- **Node.js 18+** (`node -v`)
- **PostgreSQL 15+** (pgAdmin installs with it)
- **Git**, and optionally **Postman** (import `backend/CivicEvents+ API.postman_collection.json`)

## 1. Database (PostgreSQL)

1. Install PostgreSQL from https://www.postgresql.org/download/windows/ (keep port **5432**, user **postgres**; remember the password you set).
2. Open `backend/.env` and make sure the values match your install:

   ```env
   DB_USER=postgres
   DB_PASS=<the password you chose during install>
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=civic-events-db
   JWT_SECRET=<any long random string>
   ```

## 2. Backend

```bash
cd backend
npm install
npm run db:setup   # creates the civic-events-db database (if missing) and its tables
npm run db:seed    # adds demo admin + user accounts and sample events
npm run dev        # starts the API on http://localhost:4000
```

Check it works: open http://localhost:4000/health → `{"ok":true,...}`.

**Demo accounts** (created by `db:seed`, development only):

| Role | Email | Password |
|---|---|---|
| admin | `admin@civicevents.test` | `Admin@1234` |
| user | `user@civicevents.test` | `User@1234` |

> Admins can't be created from the UI (by design). To make another admin, send `POST /api/auth/signup` from Postman with `"role": "admin"` in the body.

## 3. Frontend

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev        # watches Tailwind + serves the site on http://localhost:5500
```

Open http://localhost:5500 and log in with one of the demo accounts.

Prefer VS Code's **Live Server**? Run `npm run watch:css` in the terminal and "Open with Live Server" on `frontend/index.html`.

The backend URL is set in **`frontend/js/config.js`** (`API_BASE_URL`, default `http://localhost:4000`). Change it there if your API runs somewhere else.

See [`frontend/README.md`](frontend/README.md) for the frontend structure and where the role-based guards live.

## Backend fixes I made

The brief asks for a published toggle, ratings on the event page and register/unregister, but the provided backend had four bugs that blocked them. I kept the changes small and marked each one with a `FIX (frontend project)` comment:

| Problem | Fix | File |
|---|---|---|
| `published` was ignored when creating/editing an event, so drafts were impossible | Save `published` on create and update | `src/controllers/events.controller.js`, `src/models/events.model.js` |
| Only admins could list an event's feedback, so residents couldn't see reviews or the average rating | Any logged-in user can read it; emails are removed for non-admins | `src/routes/eventFeedback.routes.js`, `src/controllers/eventFeedback.controller.js` |
| Deleting an event that had registrations crashed (foreign key error) | Remove its registrations first | `src/models/events.model.js` |
| After cancelling, a user could never register again (409) | A cancelled registration gets re-activated | `src/models/eventRegistrations.model.js` |

I also replaced the `db:setup` / `db:seed` scripts with small Node scripts (`backend/scripts/`) because the originals needed `psql` on the PATH, used the wrong env variable name and pointed at a seed file that didn't exist.

## Credits

- Hero photo: [Kuhle Baloyi on Unsplash](https://unsplash.com/@kuhlebaloyi)
- Icons: [Lucide](https://lucide.dev) (MIT), via [Iconify](https://icon-sets.iconify.design/lucide/)
- Font: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (OFL)
