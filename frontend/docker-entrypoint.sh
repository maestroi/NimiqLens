#!/bin/sh
set -eu

BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-nimlens_backend:8787}"

sed "s|__BACKEND_UPSTREAM__|${BACKEND_UPSTREAM}|g" \
  /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
