+++
title = 'Golang 切片中删除元素'
date = 2024-07-30T14:56:43+08:00
draft = false
author = ["zzh0u"]
tags = ["技术","Golang","Debug"]
description = "有关在切片中删除元素时遇到的 Bug 以及解决方案" 
summary = "有关在切片中删除元素时遇到的 Bug 以及解决方案"
showToc = true # 显示目录
TocOpen = true # 自动展开目录
autonumbering = true # 目录自动编号
hidemeta = false # 是否隐藏文章的元信息，如发布日期、作者等
disableShare = true # 底部不显示分享栏
searchHidden = false # 该页面可以被搜索到
showbreadcrumbs = true #顶部显示当前路径
mermaid = true
+++

### 错误复现

话不多说，先上代码：

``````go
package main

import "fmt"

func main() {
	a := []int{1, 2, 3, 4, 5, 5, 6, 5, 7, 8, 9, 10}
	fmt.Println("First Slice: ", a)

	for i, value := range a {
		if value == 5 {
			a = append(a[:i], a[i+1:]...)
			fmt.Println("Index of deleted element: ", i)
			fmt.Println("Slice after delete: ", a)
		}
	}

	fmt.Println("Final Slice: ", a)
}
``````

结果如下：

``````bash
First Slice:  [1 2 3 4 5 5 6 5 7 8 9 10]
Index of deleted element:  4
Slice after delete:  [1 2 3 4 5 6 5 7 8 9 10]
Index of deleted element:  6
Slice after delete:  [1 2 3 4 5 6 7 8 9 10]
Final Slice:  [1 2 3 4 5 6 7 8 9 10]
``````

### 问题分析

看出问题了吗？让我们来理清一下思路。

首先，我们定义了一个数组切片,其中有若干个重复的 5 。代码的目的是找出数组中所有的 5 并且删除。那么代码的主要思路就是遍历整个数组，然后找出所有值为 5 的元素， 将其前后的所有元素作为新的切片重写原来的切片。  

这时候问题出现了，当找到一个值为 5 的元素时，我们试图通过 `append(a[:i], a[i+1:]...)` 来删除这个元素。但是，由于切片操作 a[:i] 和 a[i+1:] 都是在原始的 a 切片上进行的。当删除一个元素后，索引 i 后面所有的元素都会向前移动一个位置。这意味着在下一次循环迭代时，索引 i 将指向下一个 5，但由于索引已经改变，原来的 i+1 处的元素现在变成了 i 处的元素，导致这个 5 被跳过不被删除。

也就是说，当在循环中删除元素时，切片的长度会改变，这会影响后续迭代的索引。因此，删除元素后，循环中的索引可能会跳过一些元素或重复处理某些元素。

### 解决方案

#### `i` 回退

理所应当的，最先想到的解决方法就是这个了。在执行完 `append(a[:i], a[i+1:]...)` 后，再执行一次 `i--` 语句来调整索引，这样在删除元素后，下一次迭代会检查**当前**索引 i 后面的元素，而不是跳过它。

#### 两个切片

可以新建一个切片，用于存储需要保留的所有元素，最后再给切片 `a` 赋值。

``````go
package main

import "fmt"

func main() {
	a := []int{1, 2, 3, 4, 5, 5, 6, 5, 7, 8, 9, 10}
	fmt.Println("First Slice: ", a)

	var result []int
	for _, value := range a {
		if value != 5 {
			result = append(result, value)
		}
	}

	a = result
	fmt.Println("Final Slice: ", a)
}
``````

这种方法有几个优点：

- 代码简洁，易于理解。
- 不在循环中修改切片，从而避免了索引问题。

但是如果原切片很大，这种方法可能会占用更多内存，造成内存损耗。

#### 直接赋值

请看代码：

``````go
package main

import "fmt"

func main() {
    a := []int{1, 2, 3, 4, 5, 5, 6, 5, 7, 8, 9, 10}

    i := 0
    for _, v := range a {
        if v != 5 {
            a[i] = v
            i++
        }
    }

    a = a[:i]
    fmt.Println("Final Slice: ", a)
}
``````

这种方法直接在原切片上做修改，避免了前一种方法中，需要额外新建一个切片而带来可能的内存隐患

#### 逆序遍历

这种方法比较抽象，从后面往前面遍历，不过正经人应该不会这样写吧🤣

``````go

package main

import "fmt"

func main() {
	a := []int{1, 2, 3, 4, 5, 5, 6, 5, 7, 8, 9, 10}

	for i := len(a) - 1; i >= 0; i-- {
		if a[i] == 5 {
			a = append(a[:i], a[i+1:]...)
		}
	}

	fmt.Println("Final Slice: ", a)
}
``````

### 书影音

- 书
  - 读完：蛤蟆先生去看心理医生@罗伯特·戴博德｜★★★★☆

- 电影
  - 看完：谈判专家｜★★★☆☆

- 音乐
  - 在听：哭砂@陈粒&张杰｜★★★★☆
  - 在听：时候@苏运莹｜★★★★☆
