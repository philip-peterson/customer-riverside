<?php

$databases['default']['default'] = [
  'driver'    => 'pgsql',
  'database'  => getenv('DB_NAME') ?: 'drupal',
  'username'  => getenv('DB_USER') ?: 'drupal',
  'password'  => getenv('DB_PASS') ?: 'drupal',
  'host'      => getenv('DB_HOST') ?: 'postgres',
  'port'      => '5432',
  'prefix'    => '',
  'namespace' => 'Drupal\\pgsql\\Driver\\Database\\pgsql',
  'autoload'  => 'core/modules/pgsql/src/Driver/Database/pgsql/',
];

// Outside the web root — safe from direct HTTP access.
$settings['config_sync_directory'] = '/var/www/html/config/sync';

$settings['hash_salt'] = getenv('HASH_SALT') ?: 'replace-this-in-production';

$settings['update_free_access'] = FALSE;

if ($postmark_key = getenv('POSTMARK_API_KEY')) {
  $config['symfony_mailer.mailer_transport.postmark']['configuration']['dsn'] =
    'postmark+api://' . $postmark_key . '@default';
}

// On localhost/DEBUG, use the core 'php_mail' interface (which respects sendmail_path
// from php.ini, overridden to our fake-sendmail.sh that logs the email to console
// and always succeeds). This guarantees booking requests never fail with
// "mail_failed" during development.
// In non-DEBUG (production), use symfony_mailer + Postmark.
$is_dev = (bool) getenv('DEBUG');
if ($is_dev) {
  $config['system.mail']['interface']['default'] = 'php_mail';
} elseif ($postmark_key) {
  $config['mailer_transport.settings']['default_transport'] = 'postmark';
  $config['system.mail']['interface']['default'] = 'symfony_mailer';
}

// Disable CSS/JS aggregation — assets served directly from source paths.
$config['system.performance']['css']['preprocess'] = FALSE;
$config['system.performance']['js']['preprocess'] = FALSE;

if (getenv('DEBUG')) {
  $settings['container_yamls'][] = DRUPAL_ROOT . '/sites/development.services.yml';
  $settings['cache']['bins']['render'] = 'cache.backend.null';
  $settings['cache']['bins']['dynamic_page_cache'] = 'cache.backend.null';
  $settings['cache']['bins']['page'] = 'cache.backend.null';
}

// Always allow localhost variants so missing/malformed BASE_URL never locks out local dev.
$settings['trusted_host_patterns'] = ['^localhost$', '^localhost:\d+$', '^127\.0\.0\.1$', '^127\.0\.0\.1:\d+$'];

if ($base = getenv('BASE_URL')) {
  // Ensure scheme is present so parse_url extracts host/port correctly.
  if (!preg_match('#^https?://#', $base)) {
    $base = 'http://' . $base;
  }
  $base_url = $base;
  $parsed   = parse_url($base);
  $host     = $parsed['host'] ?? '';
  $port     = isset($parsed['port']) ? ':' . $parsed['port'] : '';
  if ($host && $host !== 'localhost' && !preg_match('/^127\./', $host)) {
    $settings['trusted_host_patterns'][] = '^' . preg_quote($host . $port, '/') . '$';
  }
}
