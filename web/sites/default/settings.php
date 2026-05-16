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

// Disable CSS/JS aggregation — assets served directly from source paths.
$config['system.performance']['css']['preprocess'] = FALSE;
$config['system.performance']['js']['preprocess'] = FALSE;

if ($base = getenv('BASE_URL')) {
  $base_url = $base;
}

if ($trusted = getenv('TRUSTED_HOST')) {
  $settings['trusted_host_patterns'] = ['^' . preg_quote($trusted, '/') . '$'];
} else {
  $settings['trusted_host_patterns'] = ['^localhost$', '^127\.0\.0\.1$', '^0\.0\.0\.0$'];
}
