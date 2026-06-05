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

chown -R www-data:www-data /var/www/html/web/sites/default/files
chmod -R 755 /var/www/html/web/sites/default/files

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
    -y || { echo "[entrypoint] FATAL: site:install failed."; exit 1; }
  echo "[entrypoint] Drupal installed."

  # Clear semaphores immediately after fresh install (prevents early
  # duplicate key errors during first module enables + rebuild).
  $DRUSH sql:query "TRUNCATE TABLE semaphore;" 2>/dev/null || true
fi

# Always clear stale semaphores before module enables + rebuild.
# This is the most reliable way to avoid the duplicate key errors
# on "semaphore" (CacheCollector, cron, state locks, etc.).
$DRUSH sql:query "TRUNCATE TABLE semaphore;" 2>/dev/null || true

echo "[entrypoint] Enabling required modules..."
$DRUSH en -y views views_ui field_ui text options link datetime && \
  echo "[entrypoint] Core modules enabled." || echo "[entrypoint] WARNING: core modules failed."
$DRUSH en -y webform webform_ui && \
  echo "[entrypoint] Webform enabled." || echo "[entrypoint] WARNING: webform failed."
$DRUSH en -y symfony_mailer && \
  echo "[entrypoint] Mailer enabled." || echo "[entrypoint] WARNING: symfony_mailer failed."

# Mail transport is configured via $config['system.mail']['mailer_dsn'] in settings.php,
# which is read directly by Drupal core's symfony_mailer mail plugin.
# Do NOT use the mailer_transport module's entity system for this — it is only a UI layer
# and is not consulted by core when actually sending mail.
$DRUSH en -y riverside_pt && \
  echo "[entrypoint] riverside_pt enabled." || echo "[entrypoint] WARNING: riverside_pt failed."

# Clear semaphores to avoid duplicate key violations on the semaphore
# table (e.g. during CacheCollector, cron, state operations) that can
# occur during rapid config/entity changes in the rebuild.
$DRUSH sql:query "TRUNCATE TABLE semaphore;" 2>/dev/null || true

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

# One more semaphore clear before the final cache rebuild (common source
# of the duplicate key errors seen in logs).
$DRUSH sql:query "TRUNCATE TABLE semaphore;" 2>/dev/null || true

$DRUSH cache:rebuild >/dev/null 2>&1 && echo "[entrypoint] Cache rebuilt."

if [ "${DEBUG:-false}" = "true" ]; then
  # Mock sendmail on localhost/dev: prints full email to stderr (visible in docker logs)
  # instead of erroring with "sh: 1: /usr/sbin/sendmail: not found".
  # This catches any php_mail / legacy mail() calls (e.g. some webforms, fallbacks).
  # Real emails should still go via symfony_mailer + Postmark when configured.
  cat > /usr/local/bin/fake-sendmail.sh << 'FAKE_SENDMAIL'
#!/bin/sh
echo "=== MOCK SENDMAIL (dev - email logged, not sent) ===" >&2
echo "Timestamp: $(date -Iseconds)" >&2
echo "Called as: $0 $*" >&2
echo "----- EMAIL CONTENT -----" >&2
cat >&2
echo "" >&2
echo "=== END MOCK SENDMAIL ===" >&2
exit 0
FAKE_SENDMAIL
  chmod +x /usr/local/bin/fake-sendmail.sh
  echo "[entrypoint] Installed fake sendmail for dev logging."
  # Override sendmail_path for PHP (affects php_mail interface and any direct mail()).
  echo 'sendmail_path = /usr/local/bin/fake-sendmail.sh' > /usr/local/etc/php/conf.d/sendmail.ini 2>/dev/null || true
else
  # Ensure no dev mock leaks into prod: remove any sendmail_path override and the fake script.
  rm -f /usr/local/etc/php/conf.d/sendmail.ini /usr/local/bin/fake-sendmail.sh 2>/dev/null || true
fi

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
