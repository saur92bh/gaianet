@echo off
setlocal

REM Start backend on 5174
start "server" cmd /k "cd /d %~dp0server && npm install && npm run dev"

REM Give server a head start
ping 127.0.0.1 -n 3 > nul

REM Start frontend on 5173
start "app" cmd /k "cd /d %~dp0app && npm install && npm run dev"

REM Open the app in browser
start "" "http://localhost:5173"

endlocal