# ── Stage 1: CSS build ────────────────────────────────────────────────────────
FROM node:22-slim AS node-build
WORKDIR /build
COPY package.json tailwind.config.js ./
RUN npm install --include=dev
# Copy only what Tailwind needs to scan + the input CSS
COPY web/modules/custom/riverside_pt/css/tailwind.css \
     web/modules/custom/riverside_pt/css/tailwind.css
COPY web/modules/custom/riverside_pt/templates/ \
     web/modules/custom/riverside_pt/templates/
COPY web/modules/custom/riverside_pt/src/ \
     web/modules/custom/riverside_pt/src/
COPY web/modules/custom/riverside_pt/js/components/ \
     web/modules/custom/riverside_pt/js/components/
RUN npm run build

# ── Stage 2: PHP extensions + Composer deps ───────────────────────────────────
FROM php:8.5-fpm AS php-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype-dev \
    libzip-dev \
    git \
    unzip \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        exif \
        bcmath \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html
COPY composer.json ./

RUN composer config repositories.drupal composer https://packages.drupal.org/8 \
    && composer require \
        composer/installers:^2.3 \
        drupal/core-recommended:^11 \
        drupal/core-composer-scaffold:^11 \
        "drush/drush:^13 || ^14" \
        drupal/webform \
        drupal/symfony_mailer \
        drupal/claro_compact \
        --no-update \
    && composer install --no-dev --optimize-autoloader --no-interaction \
    && rm -rf /root/.composer/cache

# ── Stage 3: Runtime image ────────────────────────────────────────────────────
FROM php:8.5-fpm

# Runtime libs for the compiled PHP extensions (no dev headers).
# php:8.5-fpm is Debian Trixie: libzip4 → libzip4t64.
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    postgresql-client \
    libpq5 \
    libpng16-16 \
    libjpeg62-turbo \
    libfreetype6 \
    libzip4t64 \
    locales \
    curl \
    gettext-base \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled PHP extension .so files and their ini enablement files
COPY --from=php-build /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=php-build /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

ENV PATH="/var/www/html/vendor/bin:${PATH}"

WORKDIR /var/www/html

# Copy scaffolded vendor + web/ from composer stage
COPY --from=php-build /var/www/html/ ./

# Overlay site-specific files on top of the scaffolded web/
COPY web/sites/default/settings.php web/sites/default/settings.php
COPY web/sites/default/files/ web/sites/default/files/
COPY web/modules/custom/ web/modules/custom/

# Overwrite with the minified CSS built in the node stage
COPY --from=node-build /build/web/modules/custom/riverside_pt/css/app.css \
    web/modules/custom/riverside_pt/css/app.css

ARG FULLCALENDAR_VERSION=6.1.15
RUN curl -fsSL "https://cdn.jsdelivr.net/npm/fullcalendar@${FULLCALENDAR_VERSION}/index.global.min.js" \
         -o web/modules/custom/riverside_pt/js/fullcalendar.min.js

COPY config/sync/ config/sync/

RUN rm -f /etc/nginx/sites-enabled/default
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/php/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN sed -i 's|;error_log = log/php-fpm.log|error_log = /var/log/php-fpm.log|' /usr/local/etc/php-fpm.conf && \
    { \
      echo 'clear_env = no'; \
      echo 'catch_workers_output = yes'; \
      echo 'php_admin_flag[log_errors] = on'; \
      echo 'php_admin_value[error_log] = /var/log/php-fpm.www.log'; \
    } >> /usr/local/etc/php-fpm.d/zz-env.conf

RUN chmod 444 web/sites/default/settings.php

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
