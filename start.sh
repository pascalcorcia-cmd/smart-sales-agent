#!/usr/bin/env bash
echo "Demarrage de Smart Sales Agent..."
echo "Ouvrez http://localhost:8000 dans votre navigateur"
echo "Ctrl+C pour arreter"
echo
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
