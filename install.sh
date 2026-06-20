#!/usr/bin/env bash
set -e

echo "============================================"
echo "  Smart Sales Agent - Installation"
echo "============================================"
echo

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERREUR] Python 3 n'est pas installe."
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "  Mac: brew install python"
    exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
    echo "[ERREUR] Node.js n'est pas installe."
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Mac: brew install node"
    exit 1
fi

# Setup .env
if [ ! -f backend/.env ]; then
    echo
    read -rp "Entrez votre cle API Anthropic (sk-ant-...): " APIKEY
    cat > backend/.env <<EOF
ANTHROPIC_API_KEY=$APIKEY
CLAUDE_MODEL=claude-sonnet-4-6
EOF
    echo "[OK] Fichier .env cree"
fi

# Install backend
echo
echo "[1/2] Installation du backend Python..."
cd backend
pip3 install -r requirements.txt
cd ..
echo "[OK] Backend installe"

# Install frontend
echo
echo "[2/2] Installation du frontend React..."
cd frontend
npm install
npm run build
cd ..
echo "[OK] Frontend installe"

# Copy build to backend static
echo
echo "Copie du frontend compile..."
rm -rf backend/static
cp -r frontend/dist backend/static
echo "[OK] Frontend copie dans backend/static"

echo
echo "============================================"
echo "  Installation terminee !"
echo
echo "  Pour lancer : ./start.sh"
echo "  Ou : cd backend && uvicorn app.main:app"
echo "  Puis ouvrez http://localhost:8000"
echo "============================================"
