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

## Modules

- **FullCalendar View** — interactive appointment calendar
- **Webform** — patient booking forms
- **Symfony Mailer** — transactional email
