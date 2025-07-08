---
title: 'Gorm 学习笔记-1'
pubDate: 2025-03-19
description: '学习有关 Gorm 的知识'
author: 'zzh0u'
tags: ["技术","Gorm","PostgreSQL"]
---

> 我们不用太去纠结应该选择哪一个 ORM 框架，熟悉了其中一个，其他的 orm 迁移成本很低，我们就选择一个 star 数量最高的，不会有出错的框架就行了，它们之间整体差异不会很大。我们更应该关注 SQL 语言本身，它远比 ORM 框架要重要的多。<a href="https://blog.pi3.fun/post/2025/03/gorm%E6%95%B0%E6%8D%AE%E5%BA%93%E7%BC%96%E7%A8%8B/"><p align="right">—Pi3</p></a>

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

为了便于管理，**推荐**选取或新建一个目录用于存放数据库数据，例如 `~/Developer/Database/`，并在该目录下新建一个 `compose.yaml` 文件，内容如下：

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

接下来，**在 `compose.yaml` 文件所在目录**启动容器：

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

完成可视化界面连接后，我们就可以在代码中连接数据库了。

## 代码连接

### 安装驱动

```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
```

### 连接

```go
import (
  "fmt"
  "gorm.io/driver/postgres"
  "gorm.io/gorm"
)

func main() {
  dsn := "user=myuser password=mypassword dbname=mydatabase host=localhost port=5432 sslmode=disable"
  db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
  if err != nil {
    panic("连接数据库失败")
  }
  fmt.Println("连接成功，db：", db)
}
```
为了深入理解 GORM 的工作机制（各个 API 具体生成什么 SQL）并同时学习 SQL，我们需要按照 GORM 文档的指导，启用并配置它自带的[日志记录器 (logger)](https://gorm.io/zh_CN/docs/logger.html)。将这个 logger 设置为全局生效后，它就会把 GORM 执行的所有数据库操作所对应的实际 SQL 语句打印出来（通常是在终端显示），让我们能够直观地看到代码背后的数据库交互细节。接下来配置 logger，并在连接时通过配置参数传入。

```go
newLogger := logger.New(
  log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
  logger.Config{
    SlowThreshold:              time.Second,    // Slow SQL threshold
    LogLevel:                   logger.Info,    // Log level
    IgnoreRecordNotFoundError: true,            // Ignore ErrRecordNotFound error for logger
    ParameterizedQueries:      true,            // Don't include params in the SQL log
    Colorful:                  false,           // Disable color
  },
)

dsn := "user:pass@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
    Logger: newLogger,
})
```
