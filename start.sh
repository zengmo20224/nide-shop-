#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "   NideShop Docker Startup"
echo "========================================="
echo
echo "[DATA SAFETY] This project must use Docker Compose for the backend and MySQL."
echo "[DATA SAFETY] Do NOT use 'docker compose down -v' unless you want to erase all MySQL data."
echo "[DATA SAFETY] MySQL data is kept in Docker volume: nideshop_mysql_data"
echo

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker was not found. Please install and start Docker Desktop."
  echo "  Download: https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERROR] Docker Compose V2 was not found."
  exit 1
fi

echo "[1/3] Building and starting containers..."
docker compose up -d --build

echo
echo "[2/3] Waiting for services..."
sleep 5

echo
echo "[3/3] Current service status:"
docker compose ps

echo
echo "========================================="
echo "   Deployment complete"
echo "========================================="
echo "  Mobile site:  http://localhost"
echo "  Admin site:   http://localhost/admin/"
echo "  API direct:   http://localhost:8360"
echo "  MySQL:        localhost:3307 root/nideshop123"
echo "========================================="
echo
echo "  Useful commands:"
echo "    Logs:        docker compose logs -f"
echo "    Safe stop:   docker compose stop"
echo "    Safe start:  docker compose start"
echo "    Safe down:   docker compose down"
echo "    Restart:     docker compose restart"
echo
echo "  DANGER:"
echo "    docker compose down -v  deletes nideshop_mysql_data and erases saved data."
echo "========================================="
