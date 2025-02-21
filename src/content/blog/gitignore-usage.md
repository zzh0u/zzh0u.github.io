---
title: 'gitignore 用法'
pubDate: 2025-02-21
description: '介绍了 gitignore 的主要用法'
author: 'zzh0u'
tags: ["技术","Git"]
---

在写代码的时候发现 `.gitignore` 文件是项目文件中不可缺少的一环，于是写一份教程（删除线）。也算是 `Git 教程`的番外篇吧。

`.gitignore` 文件用于告诉 Git 哪些文件或目录应该被忽略，不纳入版本控制。它常用于排除编译产物、临时文件、日志、敏感信息（如密码或密钥）等。

### 1. 创建 `.gitignore` 文件

在项目根目录下创建 `.gitignore` 文件（文件名固定，不可更改）。

### 2. 语法规则

#### (1) 匹配模式

- `*` 通配符：匹配任意字符（除路径分隔符）。

  ```bash
  *.log       # 忽略所有 .log 文件
  temp-*.txt  # 忽略 temp- 开头的 .txt 文件
  ```

- `/` 目录前缀：仅匹配**当前**目录下的文件或目录，**当前**是重点。

  ```bash
  # /build 忽略根目录下的 hello 目录，但不忽略子目录中的 hello
  project-path
  ├── hello
  └── test              [❌]
      └── hello         [✅]
  ```

- `/` 目录后缀：匹配目录而非文件。

  ```bash
  # logs/ 忽略所有名为 logs 的目录及其内容
  project-path
  ├── logs              [❌]
  └── logs              [✅]
      └── log.txt
  ```

- `**` 递归匹配：匹配任意层级的目录。

  ```bash
  # **/temp 忽略所有目录下的 temp 文件或目录
  project-path
  ├── temp              [✅]
  └── test
      └── temo          [✅]
  ```

- `?` 单字符匹配：匹配单个任意字符。

  ```bash
  # file?.txt 忽略 file1.txt、fileA.txt 等
  project-path
  ├── file1.txt         [✅]
  ├── fileA.txt         [✅]
  └── fileABC.txt       [❌]
  ```

#### (2) 否定规则

`!` 前缀：排除某个已忽略的文件。

```bash
# *.log 忽略所有 .log 文件
# !error.log 但保留 error.log
project-path
├── operation.log       [✅]
└── error.log           [❌]
```

### 3. 常见使用场景

#### (1) 忽略特定文件类型

```bash
# 忽略编译产物
*.class
*.exe
*.dll

# 忽略日志文件
*.log
```

#### (2) 忽略目录

```bash
# 忽略 node_modules 目录
node_modules/

# 忽略所有 build 目录
build/
```

#### (3) 忽略系统文件

```bash
# macOS 系统文件
.DS_Store

# Windows 系统文件
Thumbs.db
```

#### (4) 忽略 IDE 配置文件

```bash
# JetBrains IDE 配置
.idea/
*.iml

# VSCode 配置
.vscode/
```

#### (5) 忽略敏感信息

```bash
# 配置文件中的密钥或密码
config/secrets.yml
.env
```

---

### 4. 全局忽略规则

- 配置全局 `.gitignore` 文件（适用于所有项目）：

  ```bash
  git config --global core.excludesfile ~/.gitignore_global
  ```

- 编辑 `~/.gitignore_global` 文件添加全局规则。

### 5. 特殊情况处理

#### (1) 已跟踪的文件

- 若文件已被 Git 跟踪（已提交过），即使添加到 `.gitignore` 仍会被追踪。需手动删除缓存：

  ```bash
  git rm --cached <file>  # 从版本库移除，保留本地文件
  git commit -m "Remove ignored files"
  ```

#### (2) 空目录

- Git 默认不跟踪空目录。若需保留空目录，可在其中添加 `.gitkeep` 文件占位。

  ```bash
  touch .gitkeep
  ```

### 6. 验证忽略规则

- 使用 `git check-ignore` 命令检查文件是否被忽略：

  ```bash
  git check-ignore -v <file-path>
  ```
