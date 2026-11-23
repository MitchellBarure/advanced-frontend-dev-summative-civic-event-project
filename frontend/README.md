# Jacaranda City · Frontend

Plain HTML pages + **Tailwind CSS v4** (CLI build) + **jQuery 3.7**. No framework, no bundler. One HTML file per page, plus one JS file for that page.

## Run

```bash
npm install
npm run dev          # Tailwind watch + static server on http://localhost:5500
```

| Script | Does |
|---|---|
| `npm run dev` | Rebuilds the CSS on every change and serves the site (use this while working) |
| `npm run watch:css` | CSS watch only, if you'd rather serve the pages with VS Code Live Server |
| `npm run build:css` | One-off minified CSS build (run before committing) |
| `npm run serve` | Serve only, no CSS watch |

The backend has to be running (`cd ../backend && npm run dev`). The API URL lives in `js/config.js`.

> `css/output.css` is generated. Edit `css/input.css` or the classes in the HTML/JS, never the output file. It *is* committed, so the site works without running a build.

## Structure

```
frontend/
├── index.html            landing page (public)
├── login.html  signup.html
├── home.html             resident home after login
├── events.html  event.html  my-registrations.html
├── announcements.html  announcement.html   audio clips + player
├── promos.html  promo.html                 videos with captions
├── notifications.html  notification.html   chat-style inbox + detail
├── services.html                           service requests (resident)
├── profile.html                            my profile (edit name + email)
├── 403.html              "this page is for admins"
├── admin/
│   ├── dashboard.html  events.html  event-form.html
│   ├── announcement-form.html  promo-form.html
│   ├── notifications.html  service-requests.html
│   ├── users.html  user.html
├── css/
│   ├── input.css         design tokens (@theme) + shared classes: btn-*, input, card, chip…
│   └── output.css        compiled (generated)
├── js/
│   ├── config.js         API_BASE_URL, pageUrl()
│   ├── icons.js          Lucide icons as inline SVG: icon("bell"), or <span data-icon="bell">
│   ├── auth.js           session storage, isAdmin(), ROLE GUARDS
│   ├── api.js            $.ajax helper: Bearer token, JSON / FormData, 401 → login, 403 → message
│   ├── ui.js             toasts, confirm modal, skeletons, empty + error states, dates, form errors
│   ├── layout.js         navbar, profile menu, footer, admin sidebar, bell drawer + notification helpers
│   ├── service-requests.js  service request storage (localStorage), types and statuses
│   ├── users-common.js   role / status chips, avatar, enable-disable with confirm
│   ├── events-common.js  event card, image placeholder, register + delete helpers
│   ├── media-common.js   waveform, one-clip-at-a-time audio, video thumbnails, captions → WebVTT, publish/delete
│   ├── media-form.js     drop zone, file type/size check, preview, progress (admin media forms)
│   └── pages/            one file per page (events.js, event.js, admin-events.js, …)
└── assets/
    ├── logo.svg  logo-white.svg  favicon.svg
    ├── icons/            the Lucide SVG files (reference copies)
    └── images/hero.jpg
```

Scripts load in this order on every page: jQuery → `config` → `icons` → `auth` → `api` → `ui` → `layout` → (`events-common` / `media-common` / `media-form`) → `pages/<page>.js`.

## Design system

Palette "Jacaranda & Sandstone", defined as Tailwind tokens in `css/input.css`:

| Token | Hex | Used for |
|---|---|---|
| `jacaranda` | `#6A49FA` | primary buttons, links, active nav, logo |
| `jacaranda-deep` | `#453284` | hover, headings on light, hero overlay |
| `jacaranda-mist` | `#EEEAFF` | chips, selected states, soft sections |
| `ink` / `slate` | `#161A23` / `#242937` | text, footer, admin sidebar, auth pages |
| `canvas` | `#F7F8F8` | page background |
| `muted` | `#5B6170` | secondary text |
| `sandstone` | `#F2A93B` | highlights: stars, unread badge (always with ink text) |
| `leaf` | `#1F7A5C` | success, "Registered", "Published" |
| `sky-text` / `danger` | `#0B6BCB` / `#B42318` | info and error |

Font: Plus Jakarta Sans. Cards are `rounded-2xl`, buttons are pills at least 44px tall, and there's a 2px jacaranda focus ring everywhere.

## Role-based access (where it's enforced)

- **`js/auth.js`**: `requireLogin()` (any signed-in user), `requireAdmin()` (admins only, residents go to `403.html`), `guestOnly()` (login/signup/landing), and `applyRoleVisibility()`, which removes any element marked `data-role="admin"` or `data-role="user"` that the current role shouldn't see.
- **`js/layout.js`**: the Admin link and admin menu items are `data-role="admin"`.
- **`js/events-common.js`**: Register buttons are resident-only, Edit/Delete are admin-only.
- **`js/api.js`**: a 401 signs the user out; a 403 shows a "contact an admin" message.
- The backend still checks every request (`authenticate` + `authorize(['admin'])`). The frontend guards are only for UX.

Every guard has a short comment in the code saying what it restricts and for whom.

## Token storage

Login has a **"Keep me signed in"** checkbox. Unchecked → `sessionStorage` (gone when the browser closes). Checked → `localStorage` (stays). Tradeoff: both can be read by any script on the page, so an XSS bug could leak the token, and `localStorage` leaves it exposed for longer. All API text goes through `escapeHtml()` before it's rendered. Tokens last 1 hour; the app signs you out the moment one expires.

## Audio and video

- **Announcements:** one shared `Audio` object, so only one clip plays at a time. The waveform is decoration (CSS bars, same shape per title) that fills in as the clip plays. The detail page has its own controls: play, seek, ±10s, speed, volume, and Space / ← → shortcuts. Durations are read from the file because the backend doesn't store them.
- **Promos:** the backend stores captions as plain text (`caption_text`), so `captionsToVtt()` turns them into a WebVTT track (one cue per sentence, spread over the video length) and the track is **on by default**. Admins can also paste a full WEBVTT file. The same text is shown as the transcript under the video.
- Drafts (`published: false`) only show for admins. Residents opening a draft link get a "not found" state.

## Notifications and service requests

- **Notifications:** `GET /api/notifications` already returns broadcasts plus the ones sent to the logged-in user. The bell shows the unread count and opens a drawer (Esc closes it, focus stays inside). The inbox groups messages by day like a chat; each one opens a detail page with the full message and a button to the related event / announcement / promo from `metadata`. Admins can delete from the inbox, the detail page or **Admin → Notifications**.
- **Read / unread:** the backend's `read` column is one value shared by every user and there's no endpoint to change it, so each person's read list is kept in localStorage (`jc_read_<user id>`).
- **Service requests:** the backend has no route for them (only the 6 types in `src/utils/serviceTypes.js`), so requests are saved in localStorage (`jc_service_requests`). Residents file and track them on **Services**; admins change the status on **Admin → Service requests**. Because it's browser storage, an admin only sees requests made in the same browser.

## Dashboard, users and profile

- **Dashboard:** stat cards, "Registrations over time" (last 30 days, CSS bars, no chart library), this month vs last month, top events and content status. The backend has no "all registrations" endpoint, so `loadAllRegistrations()` (in `events-common.js`) asks each event for its attendees and puts them together. Open service requests come from localStorage.
- **Users:** search, role and status chips, an Active switch per row (turning off asks first; your own row is locked) and a detail page with that person's registrations. Roles can't be edited anywhere.
- **Profile:** edit name and email (`PATCH /api/users/profile/me`); role and status are shown locked. A 409 shows "That email is already used by another account" under the field.
- **Known backend limit:** disabling an account only sets `is_active = false`; the API never checks it. The login page reads the profile right after logging in and signs disabled accounts straight back out, but that's a frontend check only.

## Backend API notes

| What | Route |
|---|---|
| Events | `GET /api/events` returns **all** events, with no paging or filters, so search/filter/pagination happen in the browser. Residents only see `published` ones |
| Register / cancel | `POST /api/event-registrations/register` and `/cancel`, body `{ event_id }` |
| My registrations | `GET /api/event-registrations/my-registrations` (cancelled ones come back with `status: "cancelled"`) |
| Registrants (admin) | `GET /api/event-registrations/event/:event_id/attendees` |
| Feedback | `POST /api/event-feedback`, `GET /api/event-feedback/event/:event_id`, `GET /api/event-feedback/my-feedback` |
| Profile | `GET` / `PATCH /api/users/profile/me` |
| Enable/disable user | `PATCH /api/users/:id/enable`, `PATCH /api/users/:id/disable` |
| Publish toggles | `PATCH /api/promos/:id/publish|unpublish`, `PATCH /api/announcements/:id/publish|unpublish` (publishing sends residents a notification) |
| Announcements / promos | `GET /api/announcements` and `GET /api/promos` return drafts too and default to 20 items, so I ask for `?limit=100` |

Known backend limits I work around: a new promo is always created as published, so a draft gets unpublished right after; editing an announcement ignores a new audio file, so the edit form only changes the title and status.

Upload limits (checked in the browser before uploading): event image ≤ 2 MB (jpg/png/gif), promo video ≤ 8 MB (mp4/mov/avi/mkv), announcement audio ≤ 5 MB (mp3/wav/m4a/ogg).
