#!/bin/sh

DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-drupal}"
DB_NAME="${DB_NAME:-drupal}"

for var in SITE_NAME ADMIN_PASS; do
  eval val=\$$var
  if [ -z "$val" ]; then
    echo "[entrypoint] FATAL: $var is required."
    exit 1
  fi
done

echo "[entrypoint] Waiting for PostgreSQL at ${DB_HOST}..."
until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -q; do
  sleep 1
done
echo "[entrypoint] PostgreSQL is ready."

cd /var/www/html

DRUSH="vendor/bin/drush --root=/var/www/html/web"

echo "[entrypoint] Preparing database..."

if [ "${DRUPAL_FAST:-}" = "1" ]; then
  echo "[entrypoint] DRUPAL_FAST=1 — skipping database wipe and full site reinstall."
else
  echo "[entrypoint] Full rebuild mode (default). Dropping database..."
  $DRUSH sql:drop -y || true

  echo "[entrypoint] Installing Drupal (standard profile)..."
  $DRUSH site:install standard \
    --site-name="$SITE_NAME" \
    --account-name=admin \
    --account-pass="$ADMIN_PASS" \
    --base-url="${BASE_URL:-http://localhost:8080}" \
    -y || { echo "[entrypoint] FATAL: site:install failed."; exit 1; }
  echo "[entrypoint] Drupal installed."
fi

echo "[entrypoint] Enabling required modules..."
$DRUSH en -y views views_ui field_ui text options link datetime && \
  echo "[entrypoint] Core modules enabled." || echo "[entrypoint] WARNING: core modules failed."
$DRUSH en -y webform webform_ui && \
  echo "[entrypoint] Webform enabled." || echo "[entrypoint] WARNING: webform failed."
$DRUSH en -y symfony_mailer && \
  echo "[entrypoint] Mailer enabled." || echo "[entrypoint] WARNING: symfony_mailer failed."
$DRUSH en -y riverside_pt && \
  echo "[entrypoint] riverside_pt enabled." || echo "[entrypoint] WARNING: riverside_pt failed."

echo "[entrypoint] Rebuilding site structure from code (riverside:rebuild)..."
$DRUSH riverside:rebuild || echo "[entrypoint] WARNING: riverside:rebuild encountered an issue."

# Re-assert a few key pieces (cheap and safe).
$DRUSH theme:enable starterkit_theme claro_compact -y && \
  $DRUSH config:set system.theme default starterkit_theme -y && \
  $DRUSH config:set system.theme admin claro_compact -y && \
  echo "[entrypoint] Themes set." || echo "[entrypoint] WARNING: theme enable failed."

$DRUSH config:set system.site page.front /home -y && \
  echo "[entrypoint] Front page set." || echo "[entrypoint] WARNING: front page set failed."

npm run build --prefix /var/www/html >/dev/null 2>&1 && echo "[entrypoint] Tailwind built." || echo "[entrypoint] WARNING: Tailwind build failed."

$DRUSH cache:rebuild >/dev/null 2>&1 && echo "[entrypoint] Cache rebuilt."

if [ "${DEBUG:-false}" = "true" ]; then
  NGINX_CSS_CACHE='expires off; add_header Cache-Control "no-store";'
else
  NGINX_CSS_CACHE='expires max;'
fi
export NGINX_CSS_CACHE
envsubst '${NGINX_CSS_CACHE}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf
echo "[entrypoint] nginx cache mode: ${DEBUG:-false} = debug."

echo "[entrypoint] Starting services..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
