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

**Note on semaphore/lock errors in logs:** During rebuilds (especially the full non-`DRUPAL_FAST` path) you may see Postgres errors like:

```
ERROR: duplicate key value violates unique constraint "semaphore____pkey"
DETAIL: Key (name)=(state:Drupal\Core\Cache\CacheCollector) already exists.
```

This is harmless but noisy. The entrypoint and `_riverside_pt_rebuild()` proactively `TRUNCATE TABLE semaphore` at key points to suppress them. If you ever see them after a manual change, run:

```bash
docker compose exec app drush sql:query "TRUNCATE TABLE semaphore;"
```

The custom module directory is volume-mounted, so template/CSS/JS edits are live without rebuilding the Docker image. `settings.php` and `development.services.yml` are also volume-mounted.

**Known gotcha:** `drush site:install` rewrites `settings.php`. Because `settings.php` is a bind-mounted file, Docker Desktop on macOS may hold a stale inode reference after the rewrite. If Drupal shows "The provided host name is not valid for this server" after a full rebuild, restart with `DRUPAL_FAST=1` to re-establish the mount without re-running site:install.

## Stack

- **Drupal 11** (core_version_requirement: ^11)
- **PHP 8.5-fpm** (in Docker)
- **PostgreSQL 18** (db: drupal, user: drupal, pass: drupal)
- **Tailwind CSS v3** — compiled on the host via npm, output to `app.css`
- **FullCalendar 6** — `fullcalendar.min.js` is downloaded by the Dockerfile at build time but the module directory is volume-mounted, so the file must also exist on the host at `js/fullcalendar.min.js` (not gitignored; download once with `curl -fsSL https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js -o web/modules/custom/riverside_pt/js/fullcalendar.min.js`)
- **Postmark** — email via `drupal/symfony_mailer`
- **Preact 10 + htm** — loaded via esm.sh CDN imports inside each custom element JS file; no build step required

## Custom module: `riverside_pt`

All site-specific code lives here: `web/modules/custom/riverside_pt/`

### Templates

| File | Purpose |
|------|---------|
| `templates/riverside-pt-header.html.twig` | Fixed top nav with hamburger on mobile |
| `templates/riverside-pt-home.html.twig` | Home page: hero, services, mission, testimonials, booking, FAQ |

The header is injected globally via `riverside_pt_page_top()` in `.module`, not rendered by a controller.

### Controllers / routes

| Route | Path | Controller / Form |
|-------|------|-------------------|
| `riverside_pt.home` | `/home` | `HomeController::page` |
| `riverside_pt.schedule` | `/schedule` | `ScheduleController::page` |
| `riverside_pt.booking` | `/schedule/book` | `BookingForm` |
| `riverside_pt.booking_store_slot` | `/schedule/book/slot` (POST) | `ScheduleController::storeSlot` |
| `riverside_pt.schedule_events` | `/schedule/events` | `ScheduleController::events` |

`HomeController::page` attaches the `schedule` library and passes `drupalSettings.riversidePt` (eventsUrl, bookingUrl, storeSlotUrl, holidays) so the booking calendar on the home page works identically to the `/schedule` page.

`ScheduleController::events` generates mock availability Mon–Fri only (skips Sat/Sun via `N > 5` day-of-week check).

### CSS / JS

| File | Purpose |
|------|---------|
| `css/tailwind.css` | Tailwind entry point (`@tailwind base/components/utilities` + custom layers) |
| `css/app.css` | Compiled Tailwind output — **do not edit directly** |
| `css/calendar.css` | FullCalendar overrides + booking layout + slot button styles |
| `js/nav.js` | Hamburger toggle — adds/removes `is-open` on `#rpt-main-nav` |
| `js/calendar.js` | FullCalendar init: circle-per-day availability, dateClick → inline slot grid, auto-selects next business day on load |
| `js/components/rpt-toggle.js` | Generic toggle button web component |
| `js/components/rpt-carousel.js` | Facility photo carousel (used on `/schedule`) |
| `js/components/rpt-testimonials.js` | Testimonials carousel — pixel-offset scroll, pointer drag, swipe, resize debounce |
| `js/components/rpt-faq.js` | Accordion FAQ section |
| `js/components/rpt-appt-type.js` | Appointment type selector (2×2 card grid, pre-selects Diagnostic Assessment) |

### Custom element pattern

All interactive components are Preact web components following this pattern:

```js
import { h, render } from "https://esm.sh/preact@10";
import { useState } from "https://esm.sh/preact@10/hooks";
import { html } from "https://esm.sh/htm@3/preact";

class RptFoo extends HTMLElement {
  connectedCallback() { render(html`<${Foo} />`, this); }
  disconnectedCallback() { render(null, this); }
}
customElements.define("rpt-foo", RptFoo);
```

Use **double-quoted strings only** in these files — the esm.sh CDN fetch and browser JS parsing will fail silently on curly/smart quotes.

### Libraries

Defined in `riverside_pt.libraries.yml`:
- `riverside_pt/app` — `app.css` + `nav.js` + all `js/components/*.js` (as `type: module`), attached globally via `riverside_pt_page_attachments()`
- `riverside_pt/schedule` — `calendar.css` + `fullcalendar.min.js` + `calendar.js` + `core/drupalSettings`

## Home page sections (in order)

1. **Hero** — two-layer flex layout (image absolute, text relative); 2xl breakpoint adds a side-by-side split with solid teal panel
2. **Services grid** — 4-column card grid (`xl:grid-cols-4`)
3. **Mission / stats** — `bg-[#dde8f0]`, `max-w-[1200px]` content container with neck.jpg image
4. **Testimonials** — `<rpt-testimonials>` carousel; cards overflow right of a `max-w-[1200px]` safe area; pixel-offset `position:relative; left` animation; pointer drag + swipe
5. **Book An Appointment** — `<rpt-appt-type>` selector above the FullCalendar booking widget; slots display inline beside the calendar
6. **FAQ** — `<rpt-faq>` accordion; `grid-template-rows: 0fr → 1fr` expand animation

## Booking calendar details

- **Layout**: `.riverside-booking-wrap` is a flex row (stacks on mobile) — calendar left, slot grid right
- **Auto-selection**: on load, calendar navigates to the next business day; if that day has events, it is pre-selected and the first slot is highlighted
- **Slot interaction**: clicking a slot highlights it (`.riverside-slot-btn.is-selected`) and immediately POSTs to `storeSlotUrl`, then redirects to `/schedule/book`
- **No popup**: the old backdrop/panel popup was replaced with the inline side panel
- **`--cal-row-h`**: CSS custom property on `#riverside-calendar` controls row height; frame uses `calc(var(--cal-row-h) - 0.5rem)`

## Tailwind notes

- Config scans `templates/**/*.twig` and `src/**/*.php` for class names
- Breakpoints are standard Tailwind v3: `sm` = 640px, `md` = 768px, `2xl` = 1536px
- Mobile nav collapse (`max-height` slide) is in `tailwind.css` under `@layer components` because it can't be expressed with utilities
- Arbitrary Tailwind values use `_` for spaces: `bg-[#4a7a8a]`, `shadow-[-56px_2px_10px_#0000001A]`
- Non-standard CSS properties (e.g. `text-shadow`) use arbitrary property syntax: `[text-shadow:...]`

## Hero section layout technique

The hero uses two overlapping flex rows inside a `relative` section:

- **Box 1** (`absolute inset-0 flex`): image layer, out of flow, fills the section
- **Box 2** (`relative flex min-h-[480px]`): text layer, in flow, sets section height

Spacer divs with `basis-[x%] grow-[n]` control the offset columns on desktop. On mobile (`< sm`), spacers are `hidden` and content goes full-width with a gradient overlay for legibility. At `2xl`, the section switches to a true side-by-side split with the text on a solid teal background.

## Development services

`web/sites/development.services.yml` is loaded when `DEBUG=true` (set in docker-compose). It enables Twig debug/auto-reload and defines `cache.backend.null` (used by `settings.php` to disable render/page caching in dev).

## Menu / navigation

Nav items come from Drupal's `main` menu. Items titled `"Book An Appointment"` or `"Contact"` are flagged `is_cta: true` in the preprocess hook and rendered as a CTA button in the header template.

## Email

Booking confirmation emails are sent via `riverside_pt_mail()` in `.module` using the `booking_request` key. Transport is Postmark (via `drupal/symfony_mailer`), configured in `config/sync/symfony_mailer.mailer_transport.postmark.yml`. The API key is injected via the `POSTMARK_API_KEY` environment variable.

In `settings.php`:
- If `DEBUG` (dev/localhost): force `system.mail.interface.default = 'php_mail'` (so it uses the mocked sendmail_path below) and never use Postmark.
- Else if `POSTMARK_API_KEY` present (prod): set `mailer_transport.settings.default_transport = postmark` and `system.mail.interface.default = symfony_mailer`.

On localhost/dev (when `DEBUG` is truthy), a fake sendmail binary is provided (via Dockerfile + entrypoint) **only in DEBUG mode** that prints the full email to stderr (visible via `docker compose logs`) instead of failing with "sh: 1: /usr/sbin/sendmail: not found". This catches any legacy `php_mail` fallbacks. Real transactional mail goes through Postmark when configured (non-DEBUG).
