@echo off
REM TsunamiReady start script (Windows)

echo =============================================
echo Starting TsunamiReady environment
echo =============================================

REM 1) Start Django (Architects)
pushd "c:\Users\VIET\projet bd\-Tsunami-Ready\Architects"
if exist ".venv\Scripts\activate" (
    echo Starting Django server on http://127.0.0.1:8000 
    start "Django" cmd /k "cd /d "c:\Users\VIET\projet bd\-Tsunami-Ready\Architects" && .venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"
) else (
    echo [WARN] .venv not found in Architects. Run setup first.
)
popd

REM 2) Start Node backend (membre2-alerts)
pushd "c:\Users\VIET\projet bd\-Tsunami-Ready\Augmenteds_team\membre2-alerts"
if exist "server.js" (
    echo Starting Node backend on http://localhost:3001
    start "NodeAPI" cmd /k "cd /d "c:\Users\VIET\projet bd\-Tsunami-Ready\Augmenteds_team\membre2-alerts" && npm start"
) else (
    echo [WARN] server.js not found in membre2-alerts.
)
popd

REM 3) Start Flask API (Augmenteds_team/app.py)
pushd "c:\Users\VIET\projet bd\-Tsunami-Ready\Augmenteds_team"
if exist "app.py" (
    echo Starting Flask API on http://127.0.0.1:5000
    start "FlaskAPI" cmd /k "cd /d "c:\Users\VIET\projet bd\-Tsunami-Ready\Augmenteds_team" && python app.py"
) else (
    echo [WARN] app.py not found in Augmenteds_team.
)
popd

REM 4) Start frontend static server (HTTP 8080)
pushd "c:\Users\VIET\projet bd\-Tsunami-Ready\Augmenteds_team"
echo Starting static frontend on http://127.0.0.1:8080
start "Frontend" cmd /k "cd /d "c:\Users\VIET\projet bd\-Tsunami-Ready\Augmenteds_team" && python -m http.server 8080"
popd

echo =============================================
echo Done. Visits:
echo - Frontend: http://127.0.0.1:8080
echo - Django: http://127.0.0.1:8000
echo - Node API: http://localhost:3001
echo - Flask API: http://127.0.0.1:5000
echo =============================================
pause