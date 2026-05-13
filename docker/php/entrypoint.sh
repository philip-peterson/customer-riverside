#!/bin/sh
set -e

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
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='config';" \
  2>/dev/null || echo "0")

if [ "$HAS_TABLES" = "1" ]; then
  echo "[entrypoint] Database populated, importing configuration..."
  $DRUSH config:import -y 2>/dev/null && \
    echo "[entrypoint] Config imported." || \
    echo "[entrypoint] No config to import, continuing."
else
  echo "[entrypoint] Fresh database, installing Drupal..."
  $DRUSH site:install standard \
    --site-name="${SITE_NAME:-Portfolio}" \
    --account-name=admin \
    --account-pass="${ADMIN_PASS:-admin}" \
    -y
  echo "[entrypoint] Drupal installed."

  echo "[entrypoint] Enabling modules..."
  $DRUSH en -y views views_ui field_ui text options link datetime
  $DRUSH en -y webform webform_ui
  $DRUSH en -y symfony_mailer

  $DRUSH en -y riverside_pt
  echo "[entrypoint] Modules enabled."

  echo "[entrypoint] Setting themes..."                                                                                                                     
  $DRUSH theme:enable olivero claro_compact
  $DRUSH config:set system.theme default olivero -y
  $DRUSH config:set system.theme admin claro_compact -y                                                                                                             
  echo "[entrypoint] Themes set."

  if ls /var/www/html/config/sync/*.yml >/dev/null 2>&1; then
    echo "[entrypoint] Importing configuration from sync dir..."
    $DRUSH config:import -y
  fi
fi


echo "[entrypoint] Starting services..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
