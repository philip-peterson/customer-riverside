# Riverside Patient Tracker

A Drupal-based appointment scheduling site for booking sessions between patients and practitioners.

## Running locally

```sh
docker compose up --build
```

Admin login: `admin` / `admin` at `/user/login`

## Makefile commands

```sh
make shell        # open a bash shell in the app container
make drush <cmd>  # run any drush command, e.g. make drush cr
```

## Scripts

### Seed provider availability

Populates `provider_availability` nodes for the next calendar month across all active providers, using randomised noise per provider.

```sh
make drush php-script scripts/seed_availability.php
```

Preview without saving:

```sh
SEED_DRY_RUN=1 make drush php-script scripts/seed_availability.php
```

Wipe existing availability for the month before seeding:

```sh
SEED_WIPE=1 make drush php-script scripts/seed_availability.php
```

Running the script twice without `SEED_WIPE=1` will create duplicates.

## Modules

- **FullCalendar View** — interactive appointment calendar
- **Webform** — patient booking forms
- **Symfony Mailer** — transactional email
