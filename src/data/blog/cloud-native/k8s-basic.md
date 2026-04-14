---
title: 'Kubernetes 01 - 容器、运行时、引擎与编排工具'
pubDatetime: 2026-04-11
description: '系统梳理容器技术栈中的核心概念：容器、容器运行时、容器引擎与容器编排工具的区别与联系，帮助理解 Kubernetes 的工作原理。'
author: 'zzh0u'
tags: ["技术","k8s"]
---

> 不要死扣概念，先跑一个最小实现，再逐步深入。这个过程中遇到问题和新概念，再回看，会有新的理解。

最近在买了一台服务器，所以想着用它系统学习和上手一下 Kubernetes。首先，k8s 是一个容器编排工具，那为了避免误解，我们需要厘清下面几个概念：容器、容器运行时、容器引擎以及容器编排工具。

## 容器、容器运行时、容器引擎以及容器编排工具

### 1. 容器（Container）

容器是一个**标准化的软件单元**，将应用代码及其依赖（运行时、库、环境变量、配置文件）打包在一起，在宿主机操作系统上以轻量级进程形式运行，通过 Linux 内核的 namespace 和 cgroup 实现隔离与资源限制。我会使用 Docker 作为示例。他们有下面这些特征：

- 共享宿主机内核，但拥有独立的文件系统、网络和进程空间
- 是镜像的运行时实例
- 本身是被管理的对象，而非管理工具


### 2. 容器运行时（Container Runtime）

负责**直接执行容器**的底层软件，管理容器的完整生命周期（创建、启动、停止、删除），配置隔离环境（namespace、cgroups、网络、存储）。

| 类型 | 作用 | 代表 |
|------|------|------|
| 低级运行时 | 直接调用操作系统内核创建容器进程，实现真正的隔离 | runc、crun、Kata Containers |
| 高级运行时 | 管理镜像拉取/存储、容器生命周期，调用低级运行时执行 | containerd、CRI-O、Docker Engine（内含运行时）|

Kubernetes 通过 CRI（Container Runtime Interface）与高级运行时交互，不再直接操作 Docker。

### 3. 容器引擎（Container Engine）

面向用户的**交互层软件**，提供 CLI/API 接口，支持镜像构建、分发、容器管理等完整功能集。典型的有 Docker Engine。这是一个完整的容器引擎，它内部使用 containerd 作为高级运行时，再调用 runc 作为低级运行时。

| 维度 | 容器引擎 | 容器运行时 |
|------|---------|-----------|
| 定位 | 用户入口，提供完整工具链 | 底层执行层，专注生命周期 |
| 功能 | 构建镜像、管理网络卷、编排支持 | 运行容器、管理 namespace/cgroups |
| 范围 | 包含运行时作为组件 | 被引擎调用，或直接被 Kubernetes 调用 |
| 代表 | Docker Engine、Podman | containerd、CRI-O、runc |

### 4. 容器编排工具（Container Orchestration）

在**集群层面**自动化管理多容器、多主机的工具，负责调度、服务发现、负载均衡、扩缩容、故障恢复等。

核心能力：
- 调度：决定将容器部署到哪个节点
- 生命周期管理：自动重启失败容器，滚动更新
- 网络与存储：跨主机配置网络连通和持久化存储
- 资源管理：根据负载自动扩缩容

**与运行时的关系**：编排器不直接运行容器，而是调用节点上的容器运行时（通过 CRI）来执行。

| 工具 | 定位 | 特点 |
|------|------|------|
| Kubernetes | 事实标准的编排平台 | 支持多运行时（containerd/CRI-O）、功能最全 |
| Docker Swarm | Docker 内置的轻量编排 | 与 Docker CLI 集成，适合中小规模 |

### 关键区别

- 容器：被运行的实体，是镜像的运行时实例，本身是被管理的对象
- 容器运行时：底层执行软件，直接调用内核创建和管理容器进程
- 容器引擎：面向用户的交互层，包含 CLI、镜像构建等功能，内部调用运行时
- 容器编排工具：集群层面的管理平台，调度多容器、多主机，通过 CRI 调用运行时执行容器

## 参考链接

- [https://lomtom.cn/cu8xh5exyras2](https://lomtom.cn/cu8xh5exyras2)
- [https://www.redhat.com/zh-cn/topics/containers/what-is-podman](https://www.redhat.com/zh-cn/topics/containers/what-is-podman)
- [https://containerd.io/docs/](https://containerd.io/docs/)
- [https://github.com/containerd/containerd](https://github.com/containerd/containerd)
- [https://cri-o.io/](https://cri-o.io/)
- 