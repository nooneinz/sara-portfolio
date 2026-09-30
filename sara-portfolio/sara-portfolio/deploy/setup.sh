#!/usr/bin/env bash
# Usage (on a fresh Ubuntu server, as root):
#   bash deploy/setup.sh yourdomain.com
set -euo pipefail
DOMAIN="${1:?usage: setup.sh yourdomain.com}"
APP=/var/www/sara-portfolio

apt update && apt install -y nginx python3-venv certbot python3-certbot-nginx rsync
mkdir -p "$APP"
rsync -a --exclude .git --exclude .venv "$(dirname "$0")/../" "$APP/"

python3 -m venv "$APP/backend/.venv"
"$APP/backend/.venv/bin/pip" install -r "$APP/backend/requirements.txt"

if [ ! -f "$APP/backend/.env" ]; then
  read -rsp "OPENAI_API_KEY: " KEY; echo
  printf 'OPENAI_API_KEY=%s\nALLOWED_ORIGINS=https://%s,https://www.%s\n' "$KEY" "$DOMAIN" "$DOMAIN" > "$APP/backend/.env"
  chmod 600 "$APP/backend/.env"
fi
chown -R www-data:www-data "$APP"

cp "$APP/deploy/sara-api.service" /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now sara-api

sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP/deploy/nginx.conf" > /etc/nginx/sites-available/sara-portfolio
ln -sf /etc/nginx/sites-available/sara-portfolio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN" --redirect
echo "Done: https://$DOMAIN"
