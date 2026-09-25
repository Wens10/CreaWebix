#!/usr/bin/env bash
# Installation / mise à jour de CréaWebix sur un serveur Ubuntu (ex. Oracle Cloud)
# Usage : sudo bash install.sh creawebix.fr ton-email@exemple.com
set -euo pipefail

DOMAIN="${1:?Usage : sudo bash install.sh <domaine> <email>}"
EMAIL="${2:?Usage : sudo bash install.sh <domaine> <email>}"
APP_DIR=/opt/creawebix
REPO=https://github.com/Wens10/CreaWebix.git
NODE_MAJOR=24

if [ "$(id -u)" -ne 0 ]; then
  echo "Lance ce script avec sudo." >&2
  exit 1
fi

step() { echo -e "\n\033[1;36m==> $*\033[0m"; }

step "Paquets système"
apt-get update -q
apt-get install -y -q git curl ca-certificates certbot openssl

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  step "Installation de Node.js $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -q nodejs
fi
node --version

step "Ouverture des ports 80 et 443 dans le pare-feu du serveur"
# Les images Ubuntu d'Oracle bloquent tout sauf SSH par défaut
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null ||
    iptables -I INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; fi

step "Récupération du code"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
mkdir -p cert-challenges errors

step "Dépendances et compilation"
npm ci --no-audit --no-fund
npm run build

if [ ! -f .env ]; then
  step "Configuration (.env)"
  read -rp "Adresse Gmail qui envoie et reçoit les devis [creawebix@gmail.com] : " SMTP_USER
  SMTP_USER="${SMTP_USER:-creawebix@gmail.com}"
  read -rsp "Mot de passe d'application Gmail (16 lettres, sans espaces) : " SMTP_PASSWORD; echo
  read -rsp "Clé API Groq (laisser vide pour désactiver le chat) : " GROQ_API_KEY; echo

  cat > .env <<EOF
# Réseau
HOSTNAME=0.0.0.0
DOMAIN=${DOMAIN}
HTTP_PORT=80
HTTPS_PORT=443

# SSL
CERT_DIR_PATH=/etc/letsencrypt/live/${DOMAIN}
CERT_TYPE=certbot
FORCE_DOMAIN_USAGE=true

# SMTP
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_RECEIVER=${SMTP_USER}

# Chatbot (Groq)
GROQ_API_KEY=${GROQ_API_KEY}
EOF
  chmod 600 .env
fi

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  step "Premier certificat HTTPS (Let's Encrypt)"
  # Le site ne tourne pas encore : certbot ouvre lui-même le port 80 pour cette première fois.
  # Les renouvellements sont ensuite faits automatiquement par le site.
  systemctl stop creawebix 2>/dev/null || true
  certbot certonly --standalone -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive
fi

# Le site renouvelle lui-même son certificat : on coupe le renouvellement automatique de certbot,
# qui échouerait puisque le port 80 est occupé par le site
systemctl disable --now certbot.timer 2>/dev/null || true

step "Service systemd"
install -m 644 deploy/creawebix.service /etc/systemd/system/creawebix.service
systemctl daemon-reload
systemctl enable creawebix
systemctl restart creawebix

sleep 5
systemctl --no-pager --lines=15 status creawebix || true

echo -e "\n\033[1;32mTerminé ! Le site devrait répondre sur https://${DOMAIN}\033[0m"
echo "Logs en direct : sudo journalctl -u creawebix -f"
