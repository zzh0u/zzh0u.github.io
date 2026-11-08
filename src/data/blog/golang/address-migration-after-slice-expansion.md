---
title: 'Golang 切片：底层结构、传递与扩容'
pubDatetime: 2026-11-08
description: '从 slice 三字结构到传参拷贝，以及 append 扩容后地址迁移和留守引用。'
author: 'zzh0u'
tags: ["技术","Golang","Debug"]
---

在 Go 中，数组是**值类型**，赋值和作为参数传递时会复制整个数组，因此对副本的修改不会影响原数组。但切片是一个包含了「指向底层数组的指针、长度、容量」的结构（可以用引用类型理解，但不是引用类型）；赋值和传参时复制的是这个 header，底层数组不会被复制。由于多个切片可能共享同一底层数组，所以在未发生扩容、也未重新切片的前提下，通过其中一个切片修改共享范围内的元素，会影响其他共享该底层数组的切片；而一旦 append 触发扩容，切片就会指向新的底层数组，此后的修改便不再影响原切片。

## slice 结构体

运行时里，切片是三个字段并排：

```go
// Go 1.25 src/runtime/slice.go:16-20
type slice struct {
	array unsafe.Pointer    // 指向底层数组起始元素的指针 
	len   int               // lenth, 当前可见长度
	cap   int               // capacity, 从 array 起还能用到的容量，扩容判定
}
```

## 传递

切片变量本身是值。赋值或作为参数传入函数时，拷贝的是这三个字，底层数组不跟着整份复制。数组则不同：数组是值类型，赋值和传参会复制整个数组。

```go
func setFirst(s []int) {
    s[0] = 99
}

func appendOne(s []int) {
    s = append(s, 1) // 改的是副本的头
}

a := []int{1, 2, 3}
setFirst(a)
fmt.Println(a) // [99 2 3]

appendOne(a)
fmt.Println(a) // [99 2 3]，len 仍是 3
```

用例中的 `appendOne` 只会在函数内部给方法做变更，修改的是传入的副本，若需要修改外面的值，需要 `return` 返回变更后的数组，或者传递指针。

## 扩容后的地址迁移

长度超出所引用数组的容量时，会发生什么？下面把两个长度为 1 的数组摆在一起，方便看地址：

```go
package main

import "fmt"

func main() {
    var arr1 = [...]int{1}
    var arr2 = [...]int{1}
    fmt.Println("arr1 的内存地址：", &arr1[0])  // arr1 的内存地址： 0x14000112018
    fmt.Println("arr2 的内存地址：", &arr2[0])  // arr2 的内存地址： 0x14000112020 

    sli := arr1[0:1]
    fmt.Println("sli 的值：", sli)             // sli 的值： [1]
    fmt.Println("sli 的内存地址：", &sli[0])    // sli 的内存地址： 0x14000112018

    sli = append(sli, 2, 3, 4, 5)

    fmt.Println("sli 的值：", sli)             // sli 的值： [1 2 3 4 5]
    fmt.Println("sli 的内存地址：", &sli[0])    // sli 的内存地址： 0x14000132030

    fmt.Println("arr1 的内存地址：", &arr1[0])  // arr1 的内存地址： 0x14000112018
    fmt.Println("arr2 的内存地址：", &arr2[0])  // arr2 的内存地址： 0x14000112020
}
```

`arr1` 和 `arr2` 在内存里是相邻的。原先的猜测是：切片超出原始数组长度后，会顺着原数组往后继续申请内存，因为数组在内存中是顺序存储的。但这样可能会冲突，后面的地址不够。`append` 之后 `sli[0]` 的地址从 `0x14000112018` 换成了 `0x14000132030`，`arr1` 和 `arr2` 原地没动。

容量不够时，`append` 分配一块新的底层数组，把旧元素拷过去，再把切片头的 `array` 指到新地址。如果这次 `append` 发生在函数内部，换掉的是参数那份头。调用方手里的切片头仍指向旧数组(留守引用，建后文)。

## 扩容策略

`len + 追加个数 > cap` 时走 `growslice`。新容量先由 `nextslicecap` 算出来，再按元素大小对齐到内存分配的 size class，最终 `cap` 可能比公式值略大。

```go
// Go 1.25 src/runtime/slice.go:289-321 注释有删减
func nextslicecap(newLen, oldCap int) int {
	newcap := oldCap
	doublecap := newcap + newcap
	if newLen > doublecap {
		return newLen
	}

	const threshold = 256
	if oldCap < threshold {
		return doublecap
	}
	for {
		newcap += (newcap + 3*threshold) >> 2
		if uint(newcap) >= uint(newLen) {
			break
		}
	}
	if newcap <= 0 {
		return newLen
	}
	return newcap
}
```

规则可以记成三句：

1. 需要的长度已经超过 `2 * oldCap`，新容量直接取所需长度。
2. `oldCap < 256`，按两倍扩。
3. `oldCap >= 256`，每次大约加 `newcap/4`，从 2 倍平滑过渡到约 1.25 倍，直到够用。

`growslice` 分配新数组，把旧的 `[0, oldLen)` 拷过去，返回新的 `array`/`len`/`cap`。旧数组不会在这一步被立刻回收。还有别的切片头指着它时，GC 会留着。

## 留守引用

两个切片可以共享同一块底层数组。其中一个扩容之后，只有它自己的头换到新数组，另一个仍指着旧数组：

```go
package main

import "fmt"

func main() {
    s1 := make([]int, 0, 2)
    s1 = append(s1, 1, 2)
    s2 := s1[:] // 与 s1 共享底层数组

    fmt.Println("s1 的值：", s1)           // s1 的值： [1 2]
    fmt.Println("s1 的内存地址：", &s1[0])  // s1 的内存地址： 0x1400000e160
    fmt.Println("s1 的容量：", cap(s1))    // s1 的容量： 2
    fmt.Println("s2 的值：", s2)           // s2 的值： [1 2]
    fmt.Println("s2 的内存地址：", &s2[0])  // s2 的内存地址： 0x1400000e160
    fmt.Println("s2 的容量：", cap(s2))    // s2 的容量： 2

    s1 = append(s1, 3)                    // len 超过 cap，s1 换新数组

    fmt.Println("s1 的值：", s1)           // s1 的值： [1 2 3]
    fmt.Println("s1 的内存地址：", &s1[0])  // s1 的内存地址： 0x14000018120
    fmt.Println("s1 的容量：", cap(s1))    // s1 的容量： 4
    fmt.Println("s2 的值：", s2)           // s2 的值： [1 2]
    fmt.Println("s2 的内存地址：", &s2[0])  // s2 的内存地址： 0x1400000e160
    fmt.Println("s2 的容量：", cap(s2))    // s2 的容量： 2

    s1[0] = 999
    fmt.Println("s1 的值：", s1)           // s1 的值： [999 2 3]
    fmt.Println("s2 的值：", s2)           // s2 的值： [1 2]
}
```

扩容前两边地址相同，容量都是 2。`append` 之后 `s1` 的地址换了，容量变成 4；`s2` 的地址和容量不动。再改 `s1[0]`，`s2` 仍是 `[1 2]`。扩容只改写 `s1` 这份头，`s2` 的 `array` 仍指向旧数组。旧数组上还有 `s2` 这份引用，GC 不会回收它。`s2` 离开作用域、再没有别的头指着这块内存之后，它才变成可回收。

## 手写基本操作

用三个字段把这个头写出来，再实现索引、截取和 `append`。下面用 `[]T` 当底层存储，避免 `unsafe`，语义对齐即可：

```go
type Slice[T any] struct {
    array []T
    len   int
    cap   int
}

func Make[T any](len, cap int) Slice[T] {
    return Slice[T]{array: make([]T, cap), len: len, cap: cap}
}

func (s Slice[T]) Len() int { return s.len }
func (s Slice[T]) Cap() int { return s.cap }

func (s Slice[T]) Get(i int) T {
    if i < 0 || i >= s.len {
        panic("下标超出范围")
    }
    return s.array[i]
}

func (s Slice[T]) Set(i int, v T) {
    if i < 0 || i >= s.len {
        panic("下标超出范围")
    }
    s.array[i] = v
}

func (s Slice[T]) Slice(i, j int) Slice[T] {
    if i < 0 || j < i || j > s.cap {
        panic("切片边界超出范围")
    }
    return Slice[T]{array: s.array[i:s.cap], len: j - i, cap: s.cap - i}
}

func Append[T any](s Slice[T], vs ...T) Slice[T] {
    n := s.len + len(vs)
    if n <= s.cap {
        copy(s.array[s.len:], vs)
        s.len = n
        return s
    }
    newCap := nextCap(n, s.cap)
    arr := make([]T, newCap)
    copy(arr, s.array[:s.len])
    copy(arr[s.len:], vs)
    return Slice[T]{array: arr, len: n, cap: newCap}
}

func nextCap(newLen, oldCap int) int {
    newcap := oldCap
    doublecap := newcap + newcap
    if newLen > doublecap {
        return newLen
    }
    const threshold = 256
    if oldCap < threshold {
        return doublecap
    }
    for {
        newcap += (newcap + 3*threshold) >> 2
        if uint(newcap) >= uint(newLen) {
            break
        }
    }
    if newcap <= 0 {
        return newLen
    }
    return newcap
}
```

`Get`/`Set` 只接触 `array` 指向的内容。`Slice` 返回新头，和 `s[i:j]` 一样不拷元素。`Append` 在容量够时改 `len` 并写回；不够时换新 `array`。`Set` 的接收者是值，仍能改到底层：拷的是头，`array` 指向同一块存储。
