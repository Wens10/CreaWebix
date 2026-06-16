1. **Cloner le projet**  

```bash
git clone https://github.com/Wens10/CreaWebix.git

cd mon-projet
```

2. **Installer les dépendances**

```bash
npm i
```

3. **Ajouter un fichier `.env` à la racine du projet**
Ce fichier contient la configuration du serveur (certificats SSL, port d’écoute et paramètres d’envoi d’e-mails).`

Exemple de `.env` :

```env
# Réseau
HOSTNAME=localhost
DOMAIN=test.local
HTTP_PORT=8080
HTTPS_PORT=8443

# SSL
CERT_DIR_PATH=./cert
CERT_TYPE=self-signed
FORCE_DOMAIN_USAGE=false

# SMTP
SMTP_USER=contact@example.com
SMTP_PASSWORD=@MyPassword
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_RECEIVER=example@example.com
```

4. Créé les dossiers suivants à la racine du projet :

- cert
- cert-challenges
- cert-errors

5. Lancer le serveur

Mode développement :

```bash
npm run dev
```

Mode production :

```bash
npm run start
```