---
title: 'Go 结构题精要 1：空结构体设计'
pubDate: 2026-01-10
description: '从底层内存模型到工程实践，系统梳理了 struct{} 的零内存特性及其在集合实现与并发信号中的设计价值。'
author: 'zzh0u'
tags: ["技术","Golang","struct"]
---

`struct{}` （空结构题）到底占不占内存？直觉上，一个没有任何字段的结构体，似乎不应该占用空间。但当我真正去验证它在不同场景下的行为时，发现里面有不少值得理解的细节。

## 一、 `struct{}` 底层行为的理解

### 1. `unsafe.Sizeof(struct{}{})` 为什么是 0？

我第一次用 `unsafe.Sizeof` 测试空结构体时，结果是 0：

```go
unsafe.Sizeof(struct{}{})
```

返回值永远是 `0`。

这说明一件事：**空结构体本身确实不占用存储空间**。编译器在编译阶段已经把它优化掉了。它在语义上存在，但在物理内存上并没有实际负担。

对我来说，这一点是后续一切应用场景的基础。

### 2. 多个 `struct{}` 变量可能共享同一个地址

当研究逃逸分析时注意到，如果多个 `struct{}` 发生堆分配，它们甚至可能指向同一个地址。这并不是“巧合”：既然它们没有数据，就没有必要为每个实例单独分配空间。换句话说，在运行时层面，它们更像是“占位符”，而不是“对象”。

```go
package main

import "fmt"

func newEmpty() *struct{} {
	return &struct{}{}
}

func main() {
	a := newEmpty()
	b := newEmpty()

	fmt.Printf("a: %p\n", a)
	fmt.Printf("b: %p\n", b)
	fmt.Println("a == b:", a == b)
}
// OUTPUT
// a: 0x104804980
// b: 0x104804980
// a == b: true
```

## 二、如何理解它对内存布局的影响

### 一、场景 A：空结构体在中间

```go
package main

import (
	"fmt"
	"unsafe"
)

type CompactStruct struct {
	A int64
	_ struct{}
	B int32
}

func main() {
	var cs CompactStruct

	fmt.Println("=== CompactStruct ===")
	fmt.Printf("Sizeof: %d\n", unsafe.Sizeof(cs))
	fmt.Printf("Alignof: %d\n", unsafe.Alignof(cs))

	fmt.Printf("Offsetof A: %d\n", unsafe.Offsetof(cs.A))
	fmt.Printf("Offsetof B: %d\n", unsafe.Offsetof(cs.B))
}
// OUTPUT
// === CompactStruct ===
// Sizeof: 16
// Alignof: 8
// Offsetof A: 0
// Offsetof B: 8

// 内存布局实际是：
// | A (8 bytes) | B (4 bytes) | padding (4 bytes) |
```

所以可以得出：`struct{}` 没有 offset，因为它不占空间；`B` 紧跟在 `A` 之后，offset=8；结构体最大对齐单位是 8（来自 int64）；因此整体 size 必须是 8 的倍数 → 16。

> 空结构体没有影响字段排列顺序，也没有额外填充。

### 二、场景 B：空结构体在末尾

```go
package main

import (
	"fmt"
	"unsafe"
)

type PaddedStruct struct {
	A int32
	B struct{}
}

func main() {
	var ps PaddedStruct

	fmt.Println("=== PaddedStruct ===")
	fmt.Printf("Sizeof: %d\n", unsafe.Sizeof(ps))
	fmt.Printf("Alignof: %d\n", unsafe.Alignof(ps))

	fmt.Printf("Offsetof A: %d\n", unsafe.Offsetof(ps.A))
	fmt.Printf("Offsetof B: %d\n", unsafe.Offsetof(ps.B))
}
// OUTPUT
// === PaddedStruct ===
// Sizeof: 4
// Alignof: 4
// Offsetof A: 0
// Offsetof B: 4

// 内存布局：
// | A (4 bytes) |
```

`B` 的 offset 是 4，但它不占空间。整体大小 = 4；对齐 = 4（来自 int32）；这里没有额外 padding。

### 三、真正值得对比的情况

如果改成这样：

```go
type Compare struct {
	A int32
	B struct{}
	C int64
}

var c Compare
fmt.Println("Sizeof:", unsafe.Sizeof(c))
fmt.Println("Offset A:", unsafe.Offsetof(c.A))
fmt.Println("Offset B:", unsafe.Offsetof(c.B))
fmt.Println("Offset C:", unsafe.Offsetof(c.C))

// OUTPUT
// Sizeof: 16
// Offset A: 0
// Offset B: 4
// Offset C: 8

// 内存布局：
// | A (4) | padding (4) | C (8) |
```

我猜测：`B` 不占空间；真正触发 padding 的是 `C` 的 8 字节对齐需求；空结构体不会改变对齐规则。

可以用一句话总结：

## 三、在工程中的实际用法

### 1. 用 `map[string]struct{}` 实现 Set

```go
set := make(map[string]struct{})

set["apple"] = struct{}{}
set["banana"] = struct{}{}
```

这里选择 `struct{}` 而不是 `bool`，原因很直接：不需要额外存储；语义更纯粹：只表示“存在”。在大规模数据场景下，这种做法可以减少不必要的值内存占用。

### 2. 用 `chan struct{}` 做信号通知

```go
done := make(chan struct{})

go func() {
	// do work
	done <- struct{}{}
}()

<-done
```

这里并不关心数据内容，只关心“事件发生”。`struct{}` 的意义非常明确：没有数据拷贝成本；表达的是一个纯粹的“通知”。它比 `chan bool` 更符合表达意图。

### 3. 如何理解 `context.Context` 的设计选择

在 `context` 包中，`Done()` 返回的是：

```go
<-chan struct{}
```

我认为这个设计非常克制。如果用 `chan bool`，那就会隐含一个问题：这个 bool 是 true 还是 false？代表什么状态？但用 `struct{}`：不携带状态；不表达真假；只表达“取消发生了”。这是一种语义收敛，它强制我们只关注“事件”，而不是“值”。

## 四、对 `struct{}` 的总结

在我看来，`struct{}` 的价值不在于“节省几个字节”，而在于三点：

1. **它是零成本的语义占位符**
2. **它强化了“只表达存在，不表达状态”的设计理念**
3. **它让某些并发与集合结构更干净**

理解它的底层行为（Sizeof 为 0、可能共享地址、对齐规则影响），让我在设计数据结构和并发模型时更加有意识。

> `struct{}` 不是一个“空类型”，它是 Go 提供的一种极简表达工具。
