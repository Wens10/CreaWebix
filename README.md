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
SMTP_USER=creawebix@gmail.com
SMTP_PASSWORD=motdepasseapplication
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_RECEIVER=creawebix@gmail.com
```

Pour activer le chatbot, ajouter une clé API Groq (gratuite sur https://console.groq.com) :

```env
# Chatbot (optionnel : sans clé, le chat affiche qu'il est indisponible)
GROQ_API_KEY=gsk_...
# GROQ_MODEL=openai/gpt-oss-120b
```

Les consignes du chatbot (services, tarifs, contact) sont dans `src/backend/utils/workers/chatbot.ts` : à mettre à jour si les tarifs changent.

Avec Gmail, `SMTP_PASSWORD` doit être un **mot de passe d'application** (https://myaccount.google.com/apppasswords, validation en deux étapes requise), pas le mot de passe du compte.

Les demandes de devis sont envoyées depuis `SMTP_USER` vers `SMTP_RECEIVER`, avec l'e-mail du client en « Répondre à ».

4. Créer les dossiers suivants à la racine du projet :

- cert
- cert-challenges
- errors

5. Lancer le serveur

Mode développement :

```bash
npm run dev
```

Mode production :

```bash
npm run start
```