# AI Agent Project Rules

This project must be started with Docker Compose.

## Required Startup Method

Use these commands from the repository root:

```bash
docker compose up -d --build
docker compose ps
```

For the WeChat official account/test-account demo on Windows, prefer:

```text
start-wechat-demo.bat
```

This wrapper starts Docker Compose, reuses or starts the cpolar `website` tunnel, verifies `http://localhost/api/wechat/verify`, and prints the WeChat test-account URL and token.

Expected services:

```text
nideshop-mysql
nideshop-api
nideshop-nginx
```

Expected URLs:

```text
Mobile site: http://localhost
Admin site:  http://localhost/admin/
API direct:  http://localhost:8360
MySQL:       localhost:3307 root/nideshop123
```

## Data Safety Rules

Do not start the backend with local Node/MySQL for normal use.

Avoid:

```bash
npm start
node development.js
node production.js
```

Those local commands may connect to local MySQL at `127.0.0.1:3306 root/root`, which is a different database from the Docker database.

Never run this unless the user explicitly asks to erase all Docker database data:

```bash
docker compose down -v
```

The `-v` flag deletes the MySQL volume and permanently removes saved users, goods, orders, and uploaded data in the Docker database.

## Safe Stop And Restart

Safe stop:

```bash
docker compose stop
```

Safe start after stop:

```bash
docker compose start
```

Safe rebuild/restart:

```bash
docker compose up -d --build
```

Safe remove containers while keeping database data:

```bash
docker compose down
```

## Database Persistence

Docker MySQL data is stored in the named volume:

```text
nideshop_mysql_data
```

Do not delete this volume from Docker Desktop unless the user asks to reset all data.

The initial SQL file is mounted here:

```text
./nideshop-master/nideshop-master/nideshop.sql
```

It is only for first database initialization. Existing data remains in the Docker volume.

## Before Reporting Deployment Success

Verify with:

```bash
docker compose ps
```

Then check:

```bash
curl http://localhost
curl http://localhost/admin/
curl http://localhost:8360/admin/index/index
```

The API may return `401 请先登录` for admin endpoints. That means the API is reachable and auth is required; it is not a deployment failure.
