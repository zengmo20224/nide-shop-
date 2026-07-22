@echo off
chcp 65001 >nul
title NideShop Docker Startup

echo =========================================
echo    NideShop Docker Startup
echo =========================================
echo.
echo [DATA SAFETY] This project must use Docker Compose for the backend and MySQL.
echo [DATA SAFETY] Do NOT use "docker compose down -v" unless you want to erase all MySQL data.
echo [DATA SAFETY] MySQL data is kept in Docker volume: nideshop_mysql_data
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker was not found. Please install and start Docker Desktop.
    echo   Download: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose V2 was not found.
    pause
    exit /b 1
)

echo [1/3] Building and starting containers...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start containers. Check Docker Desktop and compose logs.
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for services...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Current service status:
docker compose ps

echo.
echo =========================================
echo    Deployment complete
echo =========================================
echo   Mobile site:  http://localhost
echo   Admin site:   http://localhost/admin/
echo   API direct:   http://localhost:8360
echo   MySQL:        localhost:3307 root/nideshop123
echo =========================================
echo.
echo   Useful commands:
echo     Logs:        docker compose logs -f
echo     Safe stop:   docker compose stop
echo     Safe start:  docker compose start
echo     Safe down:   docker compose down
echo     Restart:     docker compose restart
echo.
echo   DANGER:
echo     docker compose down -v  deletes nideshop_mysql_data and erases saved data.
echo =========================================
echo.
pause
