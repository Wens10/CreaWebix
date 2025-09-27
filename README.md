# Site Web - Serveur Node.js

Ce projet est un serveur web basé sur Node.js.  
Il permet notamment de recevoir un formulaire de devis et d’envoyer les données par e-mail.

---

## ⚙️ Installation et lancement

1. **Cloner le projet**  

```bash
git clone https://github.com/Wens10/CreaWebix.git

cd mon-projet
```

2. **Installer les dépendances**

```bash
npm i
```

3. **Ajouter un fichier `config.json` à la racine du projet**
Ce fichier contient la configuration du serveur (certificats SSL, port d’écoute et paramètres d’envoi d’e-mails).`

Exemple de `config.json` :

```json
{
  "certPath": "./certs/fullchain.pem",
  "keyPath": "./certs/privkey.pem",
  "port": 3000,
  "emailSenderConfig": {
    "sender": "mon.adresse@mail.com",
    "password": "motDePasseSecret",
    "host": "smtp.monfournisseur.com",
    "port": 465,
    "receiver": "destination@mail.com"
  }
}
```

🔒 Note : ne partagez pas votre fichier config.json publiquement. Ajoutez-le à votre .gitignore si nécessaire.

4. Lancer le serveur

```bash
node server.js
```

## 🚀 Utilisation

Une fois le serveur démarré avec `node server.js`, l’adresse du site (par exemple `https://localhost:3000`) sera affichée automatiquement dans la console.  

*(Le port correspond à la valeur définie dans votre `config.json`)*  