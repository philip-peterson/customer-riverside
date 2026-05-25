#!/bin/sh

DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-drupal}"
DB_NAME="${DB_NAME:-drupal}"

echo "[entrypoint] Waiting for PostgreSQL at ${DB_HOST}..."
until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -q; do
  sleep 1
done
echo "[entrypoint] PostgreSQL is ready."

cd /var/www/html

DRUSH="vendor/bin/drush --root=/var/www/html/web"

HAS_TABLES=$($DRUSH sql:query \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users';" \
  2>/dev/null || echo "0")

IS_SETUP=$($DRUSH sql:query \
  "SELECT COUNT(*) FROM config WHERE name='core.extension' AND data LIKE '%riverside_pt%';" \
  2>/dev/null || echo "0")

if [ "$HAS_TABLES" != "1" ]; then
  echo "[entrypoint] Fresh database, installing Drupal..."
  $DRUSH site:install standard \
    --site-name="${SITE_NAME:-Portfolio}" \
    --account-name=admin \
    --account-pass="${ADMIN_PASS:-admin}" \
    -y || { echo "[entrypoint] FATAL: site:install failed."; exit 1; }
  echo "[entrypoint] Drupal installed."
fi

if [ "$IS_SETUP" != "1" ]; then
  echo "[entrypoint] Running first-time setup..."

  $DRUSH en -y views views_ui field_ui text options link datetime && \
    echo "[entrypoint] Core modules enabled." || echo "[entrypoint] WARNING: core modules failed."
  $DRUSH en -y webform webform_ui && \
    echo "[entrypoint] Webform enabled." || echo "[entrypoint] WARNING: webform failed."
  $DRUSH en -y symfony_mailer && \
    echo "[entrypoint] Mailer enabled." || echo "[entrypoint] WARNING: symfony_mailer failed."
  $DRUSH en -y riverside_pt && \
    echo "[entrypoint] riverside_pt enabled." || echo "[entrypoint] WARNING: riverside_pt failed."

  $DRUSH theme:enable starterkit_theme claro_compact -y && \
    $DRUSH config:set system.theme default starterkit_theme -y && \
    $DRUSH config:set system.theme admin claro_compact -y && \
    echo "[entrypoint] Themes set." || echo "[entrypoint] WARNING: theme enable failed."

  echo "[entrypoint] First-time setup complete."
fi

if ls /var/www/html/config/sync/*.yml >/dev/null 2>&1; then
  echo "[entrypoint] Importing configuration..."
  $DRUSH config:import -y && \
    echo "[entrypoint] Config imported." || echo "[entrypoint] WARNING: config import failed."
fi

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
