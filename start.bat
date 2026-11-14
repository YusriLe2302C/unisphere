@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js and ensure npm is on PATH.
  exit /b 1
)

set "NEED_SEED=0"

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  pushd "backend"
  call npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
  set "NEED_SEED=1"
)

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  pushd "frontend"
  call npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
  set "NEED_SEED=1"
)

if "%NEED_SEED%"=="1" (
  echo Seeding the development database...
  pushd "backend"
  call npm run seed
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
)

echo Starting backend at http://localhost:5000...
start "UniSphere Backend" /D "%~dp0backend" cmd /k "npm run dev"

echo Starting frontend at http://localhost:5173...
start "UniSphere Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host localhost"

echo.
echo UniSphere is starting. Keep the two server windows open.
endlocal
