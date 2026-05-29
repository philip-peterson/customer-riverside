# Riverside Physical Therapy — Project Context

## What this is

A Drupal 11 site for Riverside Physical Therapy. Nearly all frontend work lives in a single custom module (`riverside_pt`) rather than a Drupal theme. The site runs in Docker with nginx + php-fpm + PostgreSQL.

## Running locally

```bash
docker compose up        # starts app on http://localhost:8080 (full DB wipe + rebuild from code by default)
docker compose exec app drush cr   # clear Drupal cache
npm run watch            # Tailwind CSS watcher (run on host, not in container)
npm run build            # minified production build
```

### Database & site rebuild behavior

By default, **every** `docker compose up` performs a full database wipe followed by a complete reinstall + rebuild of the site structure from code:

- Drops the database
- Runs `drush site:install standard`
- Enables modules (including `riverside_pt`)
- Runs `drush riverside:rebuild` (the single source of truth for content types, fields, roles, and navigation)

This means the site is **always** built exactly the same way from the code in `riverside_pt.install` and the Drush command. There is no persistent data between restarts unless you opt out.

**Faster iteration (preserve the database):**

```bash
DRUPAL_FAST=1 docker compose up
```

This skips the wipe + `site:install` but still runs `drush riverside:rebuild` and the rest of the startup steps. Use this when you want quicker starts during active development and don't need a completely clean slate.

You can also run the rebuild manually at any time:

```bash
docker compose exec app drush riverside:rebuild
# or the short alias
docker compose exec app drush rrb
```

The custom module directory is volume-mounted, so template/CSS/JS edits are live without rebuilding the Docker image. `settings.php` and `development.services.yml` are also volume-mounted.

## Stack

- **Drupal 11** (core_version_requirement: ^11)
- **PHP 8.5-fpm** (in Docker)
- **PostgreSQL 18** (db: drupal, user: drupal, pass: drupal)
- **Tailwind CSS v3** — compiled on the host via npm, output to `app.css`
- **FullCalendar 6** — downloaded at build time, used on the schedule page
- **Postmark** — email via `drupal/symfony_mailer`

## Custom module: `riverside_pt`

All site-specific code lives here: `web/modules/custom/riverside_pt/`

### Templates

| File | Purpose |
|------|---------|
| `templates/riverside-pt-header.html.twig` | Fixed top nav with hamburger on mobile |
| `templates/riverside-pt-home.html.twig` | Home page: hero section + services grid |

The header is injected globally via `riverside_pt_page_top()` in `.module`, not rendered by a controller.

### Controllers / routes

| Route | Path | Controller / Form |
|-------|------|-------------------|
| `riverside_pt.home` | `/home` | `HomeController::page` |
| `riverside_pt.schedule` | `/schedule` | `ScheduleController::page` |
| `riverside_pt.booking` | `/schedule/book` | `BookingForm` |
| `riverside_pt.booking_store_slot` | `/schedule/book/slot` (POST) | `ScheduleController::storeSlot` |
| `riverside_pt.schedule_events` | `/schedule/events` | `ScheduleController::events` |

### CSS / JS

| File | Purpose |
|------|---------|
| `css/tailwind.css` | Tailwind entry point (`@tailwind base/components/utilities` + custom layers) |
| `css/app.css` | Compiled Tailwind output — **do not edit directly** |
| `css/calendar.css` | FullCalendar overrides |
| `js/nav.js` | Hamburger toggle — adds/removes `is-open` on `#rpt-main-nav` |
| `js/calendar.js` | FullCalendar init and slot-selection logic |

### Libraries

Defined in `riverside_pt.libraries.yml`:
- `riverside_pt/app` — `app.css` + `nav.js`, attached globally via `riverside_pt_page_attachments()`
- `riverside_pt/schedule` — `calendar.css` + `fullcalendar.min.js` + `calendar.js`

## Tailwind notes

- Config scans `templates/**/*.twig` and `src/**/*.php` for class names
- Breakpoints are standard Tailwind v3: `sm` = 640px, `md` = 768px
- Mobile nav collapse (`max-height` slide) is in `tailwind.css` under `@layer components` because it can't be expressed with utilities
- Arbitrary Tailwind values use `_` for spaces: `bg-[#4a7a8a]`, `shadow-[-56px_2px_10px_#0000001A]`
- Non-standard CSS properties (e.g. `text-shadow`) use arbitrary property syntax: `[text-shadow:...]`

## Hero section layout technique

The hero uses two overlapping flex rows inside a `relative` section:

- **Box 1** (`absolute inset-0 flex`): image layer, out of flow, fills the section
- **Box 2** (`relative flex min-h-[560px]`): text layer, in flow, sets section height

Spacer divs with `basis-[x%] grow-[n]` control the offset columns on desktop. On mobile (`< sm`), spacers are `hidden` and content goes full-width with a gradient overlay for legibility.

## Development services

`web/sites/development.services.yml` is loaded when `DEBUG=true` (set in docker-compose). It enables Twig debug/auto-reload and defines `cache.backend.null` (used by `settings.php` to disable render/page caching in dev).

## Menu / navigation

Nav items come from Drupal's `main` menu. Items titled `"Book An Appointment"` or `"Contact"` are flagged `is_cta: true` in the preprocess hook and rendered as a CTA button in the header template.

## Email

Booking confirmation emails are sent via `riverside_pt_mail()` in `.module` using the `booking_request` key. Transport is Postmark, configured in `config/sync/symfony_mailer.mailer_transport.postmark.yml`. The API key is injected via the `POSTMARK_API_KEY` environment variable.
