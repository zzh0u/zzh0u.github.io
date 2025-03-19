---
title: 'Gorm 学习笔记'
pubDate: 2025-03-19
description: '学习有关 Gorm 的知识'
author: 'zzh0u'
tags: ["技术","Gorm","PostgreSQL"]
---

> 我们不用太去纠结应该选择哪一个 ORM 框架，熟悉了其中一个，其他的 orm 迁移成本很低，我们就选择一个 star 数量最高的，不会有出错的框架就行了，它们之间整体差异不会很大。我们更应该关注 SQL 语言本身，它远比 ORM 框架要重要的多。<a><p align="right">—Pi3</p></a>

第一篇是一些偏基础的知识，边学边写，如果有错误，欢迎指出。

## 前置条件

- 一、系统需有一个 `go` 环境，并且安装好 `gorm` 库。
- 二、需要安装好 `postgreSQL` 数据库，**推荐**将数据库部署在 `Docker`，便于管理。
- 三、有一个数据库管理工具，例如 `Navicat`、`Datagrip` 等。
- 四、本篇博客使用环境为 Macbook Pro M1，若在 Windows 环境下，建议使用 [WSL](https://zh.wikipedia.org/wiki/%E9%80%82%E7%94%A8%E4%BA%8ELinux%E7%9A%84Windows%E5%AD%90%E7%B3%BB%E7%BB%9F)。

## 起一个数据库

要进行接下来的操作，先要保证数据库能跑起来，接下来在 Docker 环境下介绍。

### 安装

```bash
docker pull postgres    # 拉取官方 PostgreSQL 镜像
docker images           # 查看本地镜像，检查是否正确拉取
```

### 运行

为了便于管理，**推荐**选取或新建一个目录用于存放数据库配置文件，例如 `compose.yaml`，我的是 `~/Developer/Database/PostgreSQL/`。在 `compose.yaml` 中写入以下内容，将用户信息和数据库名字改成自己的。

```yaml
services:
  postgres:
    image: postgres:15-alpine  # 官方镜像，推荐固定版本
    container_name: my_postgres
    environment:
      POSTGRES_USER: myuser             # 替换为你的用户名
      POSTGRES_PASSWORD: mypassword     # 替换为强密码
      POSTGRES_DB: mydatabase           # 替换为你的数据库名
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped     # 自动重启策略
    healthcheck:                # 健康检查
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:  # 数据持久化卷
```

接下**在配置文件所在目录**启动容器：

```bash
docker compose up -d    # -d 参数表示后台运行
```

### 查看

这边提供两个命令查看 `postgreSQL` 的状态：

```bash
# 查看所有正在运行的容器
docker ps

# 查看容器的资源使用情况
docker stats
```

## 连接数据库

打开你的数据库管理工具，连接到你的数据库，Docker 默认的端口为 5432。

![连接 Postgres 示例](/images/blog/link-postgres.png)

成功之后就可以开心的写代码啦。
