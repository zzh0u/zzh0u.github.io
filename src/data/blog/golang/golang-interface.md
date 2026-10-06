---
title: 'Golang 接口：隐式实现、nil 与 iface'
pubDatetime: 2026-10-06
description: '从方法集到接口赋值，以及 nil 接口陷阱和 eface/iface 两字结构。'
author: 'zzh0u'
tags: ['技术', 'Golang']
---

上一篇写了 [值接收者与指针接收者](/posts/golang/golang-value-vs-pointer-receiver)，核心落在拷贝语义和方法集。接口赋值正是按方法集来的：类型有没有实现某个接口，依据是是否实现了对应的方法。接下来我们讨论接口——隐式实现、空接口、`nil` 陷阱，以及运行时那两个字。

## 隐式实现

接口只描述「能做什么」。方法签名一致，类型就算实现了该接口，不必显式声明：

```go
type Shape interface {
    Area() float64
}

type Rect struct{ W, H float64 }

func (r Rect) Area() float64 { return r.W * r.H }

func PrintArea(s Shape) {
    fmt.Println(s.Area())
}

PrintArea(Rect{3, 4}) // 12
```

## 空接口

`interface{}` 没有方法，因此任何类型都满足它。Go 1.18 起 `any` 是它的别名。他可以接收任意类型的值，但编译器不知道里面是什么类型，要用类型断言拿出来；失败且不带 `ok` 会直接 panic：

```go
var i any = "hello"
s, ok := i.(string)
fmt.Println(s, ok) // hello true
```

## nil 接口与「装着 nil 的接口」

接口变量为 `nil`，要求类型信息和数据指针都为空。把一个 `nil` 指针装进去，类型那一侧已经不是空的了：

```go
var p *int = nil
var i any = p
fmt.Println(i == nil) // false

var j any
fmt.Println(j == nil) // true
```

## eface 与 iface

运行时里，接口变量是两个指针并排：一个指向类型信息，一个指向实际数据。空接口（`any`）对应 `eface`，带方法的接口对应 `iface`：

```go
// Go 1.25 src/runtime/runtime2.go:178-186
type iface struct {
	tab  *itab
	data unsafe.Pointer
}

type eface struct {
	_type *_type
	data  unsafe.Pointer
}
```

`data` 指向具体值，一般不把值嵌进接口变量自己里面。把非指针值赋给接口时，往往会先拷一份出来（装箱），小整数等少数情况可以走静态表，其余容易逃逸到堆。`go build -gcflags="-m"` 里看到 `escapes to heap`，接口赋值是常见原因之一。

`eface` 和 `iface` 是接口变量的两种布局；`itab` 只出现在带方法的那种里。`any` 的第一字是 `_type`，直接指向具体类型；`Shape` 这类接口的第一字是 `tab`，指向一张 `itab`。同一对「接口 × 具体类型」共用一张表，变量自己只握着 `tab` 和 `data`。调用 `s.Speak()` 时从 `tab` 取出入口再间接跳转，通常也无法内联。

这也解释了上一节：`i == nil` 比较的是这两个指针是否都为空。`_type`/`tab` 已经指向 `*int` 或 `*MyError` 时，接口就不是 `nil`。

断言到具体类型，比的是类型这一侧：`any` 上比 `_type` 和 `T` 的类型描述符是不是同一地址；带方法的接口上先看 `tab` 是否为空，再比 `tab.Type`。对得上就把 `data` 按 `T` 取出。`type switch` 按 case 书写顺序逐个比，N 个分支最坏要比 N 次。

## 接口实现原理

写 `var s Shape = Rect{}` 时，编译器在编译阶段就核对 `Rect` 是否实现了 `Shape`，过不了则编译失败。核对走 `MissingMethod`，把接口的每个方法拿到具体类型的方法集里查，同名、签名一致才算有这个方法，否则报错 `does not implement`。

编译通过之后，运行时为「接口 + 具体类型」准备一张 `itab`：`Inter` 是接口，`Type` 是具体类型，`Fun` 按接口方法顺序存放实现地址。`Fun` 写成长度 1，实际按方法数变长；`Fun[0] == 0` 表示没实现。

```go
// src/internal/abi/iface.go:14-19
// getitab、itabInit 见 src/runtime/iface.go。
type ITab struct {
	Inter *InterfaceType
	Type  *Type
	Hash  uint32
	Fun   [1]uintptr // variable sized. fun[0]==0 means Type does not implement Inter.
}
```

构造这张 `itab` 走 `getitab`：先在 `itabTable` 里找这对组合，没有就加锁、分配，再交给 `itabInit`。`itabInit` 把两边都按名字排过序的方法同步往后扫，名字、签名一致且方法导出或同属一个包，就把实现地址写入 `Fun`。找不到则留下 `Fun[0] == 0`。同一对类型第二次走 `getitab`，基本只是查已有的 `itab`。

## 组合与用法

接口可以嵌接口。标准库的 `io.ReadWriter`、`io.ReadWriteCloser` 都是这样，小接口拼起来。

```go
// Go 1.25 src/io/io.go:86-134
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}
```

实践上几条就够用，接口定义在使用方，而不是实现方；接口尽量小，`io.Reader` 一个方法反而是强抽象；函数签名倾向「参数收接口，返回给具体类型」。热路径上接口调用有成本，需要再换成具体类型或泛型。
