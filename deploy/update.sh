#!/usr/bin/env bash
# Met le site en ligne à jour avec la dernière version poussée sur GitHub
# Usage : sudo bash /opt/creawebix/deploy/update.sh
set -euo pipefail

cd /opt/creawebix
git pull --ff-only
npm ci --no-audit --no-fund
npm run build
systemctl restart creawebix

sleep 5
systemctl --no-pager --lines=10 status creawebix || true
