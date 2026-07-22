# NideShop 本地运行说明

本项目请使用 Docker Compose 启动，避免连接到本机 MySQL 导致数据分散或看起来丢失。

## 启动

```bash
docker compose up -d --build
docker compose ps
```

或在 Windows 上双击：

```text
start.bat
```

## 公众号演示一键启动

如果要继续测试微信公众号测试号、自动回复和 H5 链接，Windows 上双击：

```text
start-wechat-demo.bat
```

它会自动完成：

- 启动 Docker 后端、MySQL、Nginx
- 复用或启动 cpolar 的 `website` 隧道
- 检查本地 H5 页面
- 检查微信公众号测试号回调接口
- 打印测试号需要填写的 URL 和 Token

测试号中填写：

```text
URL:   https://你的公网域名/api/wechat/verify
Token: nideshop
```

当前公网域名会优先从 `.env` 的 `WECHAT_OAUTH_REDIRECT_URL` 推导。如果 cpolar 生成了新域名，需要同步更新 `.env`、测试号 URL 和公众号菜单/自动回复里的链接。

## 访问

```text
前台页面: http://localhost
后台页面: http://localhost/admin/
API 地址:  http://localhost:8360
MySQL:     localhost:3307 root/nideshop123
```

## 数据持久化

Docker MySQL 数据保存在：

```text
nideshop_mysql_data
```

不要执行：

```bash
docker compose down -v
```

不要在 Docker Desktop 中删除 `nideshop_mysql_data`。

安全停止：

```bash
docker compose stop
```

安全再次启动：

```bash
docker compose start
```

详细说明见：

[docs/docker部署与数据持久化说明.md](docs/docker部署与数据持久化说明.md)
