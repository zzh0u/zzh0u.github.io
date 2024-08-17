+++
title = 'Ifconfig输出'
date = 2024-08-17T16:54:56+08:00
draft = false 
author = ["zzh0u"]
tags = ["技术","终端","Macbook","Ifconfig"]
description = "ifconfig, interfaces" 
summary = "简单介绍了 ifconfig 下输出的大部分接口作用"
showToc = true # 显示目录
TocOpen = true # 自动展开目录
autonumbering = true # 目录自动编号
hidemeta = false # 是否隐藏文章的元信息，如发布日期、作者等
disableShare = true # 底部不显示分享栏
searchHidden = false # 该页面可以被搜索到
showbreadcrumbs = true #顶部显示当前路径
mermaid = true
+++

最近在看本机 ip 的时候，发现 `ifconfig` 输入的 `interface` 有点太多了X(

```bash
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> 
gif0: flags=8010<POINTOPOINT,MULTICAST> mtu 1280
stf0: flags=0<> mtu 1280
anpi0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
anpi1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
anpi2: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en4: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en5: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en6: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en1: flags=8963<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en2: flags=8963<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en3: flags=8963<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
bridge0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
ap1: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
utun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1500
awdl0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
llw0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
utun1: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
utun2: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 2000
utun3: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1000
utun4: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
utun5: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
utun6: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
utun7: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
utun8: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
utun9: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
```

由于篇幅原因，全放出来就刷屏了，这里隐去一部分信息，只保留了每个接口的第一行。更多可以去看 Apple 官网的 [这个帖子](https://discussions.apple.com/thread/251042456?sortBy=rank)，或者在自己的 MacBook上敲一敲，还能看看 Reddit 论坛的 [这个帖子](https://www.reddit.com/r/MacOS/comments/yen2l5/too_many_interfaces/)。

以下是各个接口的主要作用：

- lo0 是本地回环接口，用于本机内部的网络通信。inet 127.0.0.1 和 inet6 ::1 是 IPv4 和 IPv6 的本地回环地址。
- gif0 和 stf0 通常用于 VPN 连接。
- anpi0、anpi1 和 anpi2 是一些网络接口，media 状态是 none，表明它们当前没有连接任何网络。
- en0 到 en6 表示以太网接口。en0 通常是指第一个以太网接口。en0 显示了 IPv4 地址和 IPv6 地址。
- bridge0 是一个桥接接口，它将多个网络接口（如 en1、en2 和 en3）合并为一个单一的逻辑通道。
- ap1 可能是无线接入点接口。
- utun0 到 utun9 是虚拟隧道接口，通常用于 VPN 连接。
- awdl0 和 llw0 是苹果无线发现服务和链接层。
- vmenet0 到 vmenet2 以及 bridge100 和 bridge101 是虚拟机网络接口或桥接接口，用于虚拟化技术。
- 每个接口的 flags 字段显示了接口的状态，如是否启用（UP）、是否支持广播（BROADCAST）、是否运行中（RUNNING）等。
- mtu 表示最大传输单元，即接口可以处理的最大数据包大小。
- options 字段包含了接口的额外配置选项。
- media 显示了接口的物理介质状态，如 autoselect 表示自动选择介质类型。
- status 显示了接口的当前状态，active 表示正在使用中，而 inactive 表示当前没有使用。

### 书影音

- 书
  - 在读：转型中的地方政治——官员激励与治理@周黎安

- 电影
  - 看完：美丽心灵｜★★★☆☆

- 音乐
  - 在听：La liste@Rose｜★★★☆☆
  - 在听：Viva La Vida@Coldplay｜★★★★☆
