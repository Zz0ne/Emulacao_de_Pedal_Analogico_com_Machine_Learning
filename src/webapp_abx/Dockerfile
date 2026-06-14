FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql && a2enmod headers

COPY docker/abx.conf /etc/apache2/conf-available/abx.conf
RUN a2enconf abx

# Código (para deploys image-only, ex. Coolify). Em dev é sobreposto por bind mount.
COPY . /var/www/html/

RUN mkdir -p /var/www/html/backend/logs \
    && chown -R www-data:www-data /var/www/html

ENV APP_ENV=prod
