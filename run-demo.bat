@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo  PADANG MERDEKA - FULL LOCAL DEMO
echo ===============================================
echo.

echo [1/4] Checking backend dependencies...
pushd "%~dp0backend"
if not exist node_modules call npm install
popd

echo [2/4] Checking POS connector dependencies...
pushd "%~dp0pos-connector"
if not exist node_modules call npm install
popd

echo [3/4] Starting services...
start "PM Backend" /D "%~dp0backend" cmd /k "set ADMIN_API_KEY=dev-admin-key&& set POS_CONNECTOR_TOKEN=dev-pos-token&& set FRONTEND_ORIGINS=http://localhost:5510,http://127.0.0.1:5510&& npm start"
timeout /t 2 /nobreak >nul
start "PM Mock POS" /D "%~dp0pos-connector" cmd /k "npm run mock-pos"
timeout /t 1 /nobreak >nul
start "PM POS Connector" /D "%~dp0pos-connector" cmd /k "set API_BASE_URL=http://localhost:3000&& set POS_CONNECTOR_TOKEN=dev-pos-token&& set POS_BASE_URL=http://localhost:5050&& set POS_RESERVATION_PATH=/api/reservations&& npm start"
timeout /t 1 /nobreak >nul
start "PM Frontend" /D "%~dp0frontend" cmd /k "python -m http.server 5510"
timeout /t 2 /nobreak >nul

echo [4/4] Opening browser...
start "" "http://localhost:5510/index.html?v=production-ready-1"
start "" "http://localhost:5510/restaurant-console.html?v=production-ready-1"

echo.
echo Frontend : http://localhost:5510
echo Backend  : http://localhost:3000
echo Mock POS : http://localhost:5050
echo Admin key: dev-admin-key
echo.
echo Flow demo:
echo 1. Submit reservasi dari website customer.
echo 2. Di Restaurant Console masukkan: dev-admin-key
echo 3. Klik Confirm.
echo 4. Lihat window Mock POS. Reservasi akan muncul di localhost POS.
echo.
pause
