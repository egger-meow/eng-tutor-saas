@echo off

taskkill /FI "WINDOWTITLE eq Paper English Admin*" /T /F >nul 2>&1

timeout /t 1 /nobreak >nul

start "Paper English Admin" cmd /k ^
"cd /d C:\IDEA\eng-tutor-saas && title Paper English Admin && pnpm admin"
