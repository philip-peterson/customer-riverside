FROM php:8.5-fpm

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    postgresql-client \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype-dev \
    libzip-dev \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        exif \
        bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV PATH="/var/www/html/vendor/bin:${PATH}"

WORKDIR /var/www/html

# Copy composer manifest first for layer caching; install pulls Drupal from Packagist.
# To use ../drupal instead, add it as a path repository in composer.json:
#   "repositories": [{"type": "path", "url": "../drupal/core", "options": {"symlink": false}}]
# then bump drupal/core-recommended to "11.x-dev@dev" and rebuild.
COPY composer.json ./

RUN composer config repositories.drupal composer https://packages.drupal.org/8

RUN composer install --no-dev --optimize-autoloader --no-interaction

# Overlay our site-specific files on top of the scaffolded web/
COPY web/sites/default/settings.php web/sites/default/settings.php
COPY web/sites/default/files/ web/sites/default/files/
COPY config/sync/ config/sync/

# Debian nginx runs as www-data (matches php-fpm), config in conf.d/
RUN rm -f /etc/nginx/sites-enabled/default
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN chown -R www-data:www-data web/sites/default/files && \
    chmod -R 755 web/sites/default/files && \
    chmod 444 web/sites/default/settings.php

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
