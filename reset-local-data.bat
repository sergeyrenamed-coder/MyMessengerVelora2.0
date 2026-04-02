@echo off
cd /d %~dp0
if exist messenger.db del /f /q messenger.db
if exist uploads (
  del /f /q uploads\* >nul 2>nul
)
echo Local data reset complete.
pause
