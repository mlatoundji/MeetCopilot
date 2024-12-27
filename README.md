# MeetCopilot - Application de Transcription Audio en Temps Réel

## Description
MeetCopilot est une application web conçue pour capturer l'audio (microphone ou audio système) à partir du navigateur et transcrire les paroles en temps réel à l'aide des API Whisper ou AssemblyAI. Elle propose également des suggestions de réponses basées sur l'audio capturé. Les clés API restent sécurisées côté serveur grâce à une architecture frontend-backend.

## Fonctionnalités principales
- **Capture audio :** Capture de l'audio depuis le microphone ou les sons du système.
- **Transcription en temps réel :** Envoi des données audio aux API Whisper ou AssemblyAI pour transcription.
- **Suggestions contextuelles :** Génération de suggestions basées sur le contexte de la conversation via GPT.

## Prérequis
- **Node.js** (version 14 ou supérieure)
- **Python** (optionnel pour servir le frontend localement)
- Clés API pour OpenAI (Whisper) et AssemblyAI

## Arborescence du projet
```
.
├── public
│   ├── index.html         # Page principale avec interface utilisateur
│   ├── main.js            # Logique frontend pour capturer et envoyer l'audio
├── server.js              # Serveur NodeJS pour cacher les clés API et gérer les endpoints
├── .env                   # Fichier d'environnement pour stocker les clés API
└── package.json           # Dépendances du projet
```

## Installation et Lancement

### 1. Installation des dépendances
Assurez-vous d'avoir installé Node.js et NPM.

```bash
npm install
```

### 2. Configuration des variables d'environnement
Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
OPENAI_API_KEY="votre_clé_API_OpenAI"
ASSEMBLYAI_API_KEY="votre_clé_API_AssemblyAI"
PORT=3000
```

### 3. Démarrage du serveur backend
Lancez le serveur Node.js pour gérer les appels aux API.

```bash
node server.js
```

### 4. Démarrage du frontend
Servez les fichiers frontend à l'aide de Python ou de tout autre serveur HTTP statique. Par exemple :

```bash
python -m http.server 8000
```

Accédez à l'application via : [http://localhost:8000](http://localhost:8000)

## Utilisation

1. **Démarrage de la capture :**
   - Cliquez sur **Start System Capture** pour capturer l'audio système.
   - Cliquez sur **Start Mic** pour capturer l'audio du microphone.

2. **Transcription :**
   - Les données audio capturées sont envoyées aux API pour transcription.
   - Les résultats apparaissent dans la zone de transcription.

3. **Suggestions :**
   - Cliquez sur **Generate Suggestions** pour obtenir des suggestions de réponses basées sur le contexte de la conversation.

## Structure des Endpoints Backend
- **POST `/transcribe/whisper`** : Envoi de l'audio pour transcription via Whisper.
- **POST `/transcribe/assemblyai`** : Envoi de l'audio pour transcription via AssemblyAI.
- **POST `/suggestions`** : Génération de suggestions basées sur GPT.

## Dépendances
- **Frontend** : JavaScript (utilisant les APIs Web Audio et Media)
- **Backend** :
  - `express` : Framework Node.js pour gérer les routes
  - `multer` : Gestion des fichiers audio uploadés
  - `node-fetch` : Pour effectuer les requêtes HTTP
  - `dotenv` : Gestion des variables d'environnement

## Développement futur
- **Support multilingue :** Ajout de langues supplémentaires pour les transcriptions.
- **Amélioration de l'interface utilisateur :** Intégration de visualisations audio en temps réel.
- **Optimisation des performances :** Réduction de la latence pour une meilleure expérience utilisateur.

## Contribution
Les contributions sont les bienvenues ! N'hésitez pas à ouvrir des issues ou des pull requests sur le dépôt GitHub.

## Licence
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus d'informations.

