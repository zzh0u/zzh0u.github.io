+++
title = 'Golang切片长度'
date = 2024-10-06T19:43:34+08:00
draft = false
author = ["zzh0u"]
tags = ["技术","Golang","Debug"]
description = "Golang 中，切片长度超出原数组长度" # 文章描述，与搜索优化相关
summary = "Golang 中有关切片长度超出原数组长度的探索" # 文章简单描述，会展示在主页
autonumbering = true # 目录自动编号
hidemeta = false # 是否隐藏文章的元信息，如发布日期、作者等
disableShare = true # 底部不显示分享栏
searchHidden = false # 该页面可以被搜索到
showbreadcrumbs = true #顶部显示当前路径
mermaid = true

+++

> 在此斗胆假设读者已经对 Golang 的数组和切片有了一定的了解orz

众所周知，Golang 中数组是「值类型」，赋值和作为参数传递时会复制整个数组。切片是「引用类型」，赋值和作为参数传递时只会复制切片本身（底层数组不会被复制）。由于切片内部包含对底层数组的引用，所以对切片内容的修改会影响原始切片。

那么如果切片在进行 append 操作时，长度超过了所引用数组的长度，会发生什么呢？

```go
package main

import "fmt"

func main() {
	var arr1 = [...]int{1}
	var arr2 = [...]int{1}
	fmt.Println("arr1 的内存地址：", &arr1[0])
	fmt.Println("arr2 的内存地址：", &arr2[0])

	sli := arr1[0:1]
	fmt.Println("sli 的值：", sli)
	fmt.Println("sli 的内存地址：", &sli[0])

	sli = append(sli, 2, 3, 4, 5)

	fmt.Println("——————执行 append 操作后——————")
	fmt.Println("sli 的值：", sli)
	fmt.Println("sli 的内存地址：", &sli[0])

	fmt.Println("arr1 的内存地址：", &arr1[0])
	fmt.Println("arr2 的内存地址：", &arr2[0])
}
OUTPUT:
arr1 的内存地址： 0x14000112018
arr2 的内存地址： 0x14000112020
sli 的值： [1]
sli 的内存地址： 0x14000112018
——————执行 append 操作后——————
sli 的值： [1 2 3 4 5]
sli 的内存地址： 0x14000132030
arr1 的内存地址： 0x14000112018
arr2 的内存地址： 0x14000112020
```

首先出于方便观察的目的，arr1 和 arr2 的长度都是一，而且在内存中时**相邻**的。我原本的猜测是切片超出原始数组长度后，会在原本的数组内存处往后继续申请内存（毕竟数组在内存中是顺序存储的），但我有一些想当然了。看了代码之后，读者们肯定也已经想清楚了这个逻辑:-）

**如果改变导致切片扩容（即超出原有容量），则会分配一个新的底层数组。这时，函数内部的切片副本会指向这个新的数组，而外部的原始切片仍然指向旧的数组。**

其实不管有没有 arr2 这个数组，sli 都会被引向一个新的底层数组，但出于篇幅考虑，就没有贴代码，读者可以自行验证（真的很简单）。
