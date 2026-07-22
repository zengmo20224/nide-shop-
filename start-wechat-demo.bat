@echo off
chcp 65001 >nul
title NideShop WeChat Demo Startup

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-wechat-demo.ps1"

echo.
pause
