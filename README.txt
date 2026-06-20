============================================
  SMART SALES AGENT - Guide d'installation
============================================

Agent IA commercial multi-outils avec Claude.
Recherche web, analyse de fichiers, qualification BANT/MEDDPICC, account planning.


PREREQUIS
---------
- Python 3.10+    https://www.python.org/downloads/
- Node.js 18+     https://nodejs.org/
- Une cle API Anthropic  https://console.anthropic.com/


INSTALLATION RAPIDE
-------------------

1. Configurer la cle API :

   Copier .env.example vers backend/.env
   Editer backend/.env et remplacer "your-api-key-here" par votre cle sk-ant-...

2. Installer et compiler :

   npm run setup

3. Lancer :

   npm start

4. Ouvrir http://localhost:8000 dans le navigateur


COMMANDES DISPONIBLES
---------------------

  npm run setup          Installe tout (Python + Node) et compile le frontend
  npm start              Lance le serveur de production (port 8000)
  npm run build          Recompile le frontend uniquement
  npm run dev:backend    Lance le backend en mode developpement (hot reload)
  npm run dev:frontend   Lance le frontend en mode developpement (Vite, port 5173)
  npm run install:all    Installe les dependances sans compiler


INSTALLATION AVEC DOCKER
-------------------------

  cp .env.example .env
  (editer .env avec votre cle API)
  docker compose up --build

  -> http://localhost:8000


SCRIPTS ALTERNATIFS
-------------------

  Windows :   install.bat   puis   start.bat
  Linux/Mac : ./install.sh  puis   ./start.sh


STRUCTURE DU PROJET
-------------------

  smart-sales-agent/
  ├── backend/              API Python (FastAPI + Claude)
  │   ├── app/
  │   │   ├── main.py       Point d'entree API
  │   │   ├── agent.py      Boucle agent avec tool calling
  │   │   ├── config.py     Configuration
  │   │   ├── prompts/      Prompts systeme sales
  │   │   └── tools/        Outils (recherche web, fichiers, API, code)
  │   ├── requirements.txt
  │   └── .env              Cle API (a creer)
  ├── frontend/             Interface React (Vite)
  │   └── src/
  │       ├── App.jsx        Navigation Chat / Account Plan
  │       └── components/    Composants UI
  ├── package.json          Commandes racine
  ├── Dockerfile            Build Docker multi-stage
  ├── docker-compose.yml    Lancement Docker
  ├── install.bat / .sh     Scripts d'installation
  └── start.bat / .sh       Scripts de demarrage
