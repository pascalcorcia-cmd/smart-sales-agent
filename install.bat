@echo off
echo ============================================
echo   Smart Sales Agent - Installation Windows
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installe.
    echo Telechargez-le sur https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe.
    echo Telechargez-le sur https://nodejs.org/
    pause
    exit /b 1
)

:: Setup .env
if not exist ".env" (
    if not exist "backend\.env" (
        echo.
        set /p APIKEY="Entrez votre cle API Anthropic (sk-ant-...): "
        echo ANTHROPIC_API_KEY=%APIKEY%> backend\.env
        echo CLAUDE_MODEL=claude-sonnet-4-6>> backend\.env
        echo [OK] Fichier .env cree
    )
)

:: Install backend
echo.
echo [1/2] Installation du backend Python...
cd backend
pip install -r requirements.txt
cd ..
echo [OK] Backend installe

:: Install frontend
echo.
echo [2/2] Installation du frontend React...
cd frontend
call npm install
call npm run build
echo [OK] Frontend installe

:: Copy build to backend static
echo.
echo Copie du frontend compile...
if exist "backend\static" rmdir /s /q "backend\static"
xcopy /e /i /q frontend\dist backend\static
echo [OK] Frontend copie dans backend\static

echo.
echo ============================================
echo   Installation terminee !
echo.
echo   Pour lancer : start.bat
echo   Ou : cd backend ^&^& uvicorn app.main:app
echo   Puis ouvrez http://localhost:8000
echo ============================================
pause
