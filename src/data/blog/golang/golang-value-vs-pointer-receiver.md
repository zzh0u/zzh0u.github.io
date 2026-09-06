---
title: 'Golang 方法接收者：值接收者与指针接收者'
pubDatetime: 2026-09-06
description: '值接收者与指针接收者的拷贝语义、方法集差异，以及选型时的取舍。'
author: 'zzh0u'
tags: ['技术', 'Golang', '方法']
---

Go 的方法与普通函数相比，多了一个接收者（receiver）。写法上只差一个星号——`func (t T)` 与 `func (t *T)`——却牵涉三件事：会不会改到原值、会不会整份拷贝、以及类型最终具备怎样的方法集。后两者尤其容易被忽略：方法调用时编译器会自动取址或解引用，看起来 `T` 与 `*T` 似乎都能用；一旦涉及接口赋值，差异就会立刻暴露出来。

## 值接收者

值接收者传入的是接收者的副本。方法内部对普通字段的赋值，只作用于这份副本，调用方手里的原值不会变：

```go
type User struct {
    Name string
    Age  int
}

func (u User) SetAge(age int) {
    u.Age = age
}

u := User{Name: "Tom", Age: 20}
u.SetAge(30)
fmt.Println(u.Age) // 20
```

若结构体里含有指针、`map`、`slice`、`channel` 等字段，还要警惕「浅拷贝」：副本里拷贝的是引用本身，而不是底层数据。通过副本改底层数据，原值一侧能看见；对字段本身重新赋值，则只改副本里的 header：

```go
type Profile struct {
    Tags []string
}

func (p Profile) SetFirst(tag string) {
    p.Tags[0] = tag // 改的是共享的底层数组
}

func (p Profile) AddTag(tag string) {
    p.Tags = append(p.Tags, tag) // 改的是副本的 header
}

p := Profile{Tags: []string{"a"}}
p.SetFirst("x")
fmt.Println(p.Tags) // [x]

p.AddTag("b")
fmt.Println(p.Tags) // [x]，原值 len 仍为 1
```

上例里 `Tags` 的 `len == cap`，`append` 会换新底层数组，所以原值完全看不见 `"b"`。若副本切片还有剩余容量，`append` 仍可能往共享底层数组里写入元素——原值的 `len` 不会变，但那段内存已被改写。是否共享底层数组，是切片自己的规则；接收者类型只决定 header 有没有被拷回去。「引用字段共享」也不等于「值接收者也能改切片长度」。值接收者保证的是值语义下的字段拷贝，不是深层不可变。

## 指针接收者

指针接收者拿到的是原值地址，因此可以修改原值，也避免对较大结构体做整份拷贝：

```go
func (u *User) SetAge(age int) {
    u.Age = age
}

u := User{Name: "Tom", Age: 20}
u.SetAge(30) // 等价于 (&u).SetAge(30)
fmt.Println(u.Age) // 30
```

对包含 `sync.Mutex` 一类不可随意复制的字段的类型，指针接收者几乎是刚需——值拷贝会把锁一并复制出去，语义直接坏掉：

```go
type Counter struct {
    mu    sync.Mutex
    count int
}

func (c *Counter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}
```

只要变量可寻址，编译器会为指针接收者自动取址；指针变量调用值接收者方法时，也会自动解引用。日常写法里 `u.M()` 与 `(&u).M()` 常常都能编译通过，于是容易误以为两种接收者差不多。真正拉开差距的是方法集，以及由此决定的接口实现关系。

## 方法集与接口

Go 用方法集判断一个类型是否实现了某个接口：

| 类型 | 方法集 |
|------|--------|
| `T` | 仅含值接收者方法 |
| `*T` | 含值接收者方法，也含指针接收者方法 |

若接口方法以值接收者实现，`T` 与 `*T` 通常都能赋给该接口；若以指针接收者实现，则只有 `*T` 实现该接口，`T` 不行：

```go
type Speaker interface {
    Speak()
}

type Dog struct{}

func (d Dog) Speak() {}

var s Speaker
s = Dog{}  // ok
s = &Dog{} // ok

type Cat struct{}

func (c *Cat) Speak() {}

var s2 Speaker
// s2 = Cat{}  // 编译错误：Cat 未实现 Speaker
s2 = &Cat{}    // ok

c := Cat{}
c.Speak() // ok：c 可寻址，编译器自动取址
// Cat{}.Speak() // 编译错误：字面量不可寻址，无法自动取址
```

具体类型上，只有可寻址的值才能为指针接收者隐式取址；接口赋值则完全按方法集匹配，不会做这层语法糖。所以会出现「`c := Cat{}; c.Speak()` 能调，却无法把 `c` 赋给 `Speaker`」——不是编译器前后矛盾，而是两套规则本来就不对称。

写库或暴露接口时，我会先确认调用方手里更常见的是值还是指针。若方法必须用指针接收者，对外就把 `*T` 当作实现类型来设计，而不是指望使用者总能取到地址。

## 如何选择

值接收者更适合小型、以值传递为习惯的类型（如 `time.Time`、`time.Duration`，以及字段很少的不可变小结构体）；方法只读，且希望调用方明确看到值语义；又或者接收者类型本身已是引用语义（`map`、`func`、`chan`），再包一层指针收益有限。即便如此，只要结构体里还有引用字段，就不能把值接收者理解成「天然并发安全」或「天然不可变」——浅拷贝问题仍在。

## 小结

1. 值接收者拷贝的是接收者本身；普通字段的修改不回写，引用字段则可能共享底层数据，但字段 header 的重绑不会回到原值。
2. 指针接收者面向原值与共享身份，适合需要修改、避免大对象拷贝，以及不可复制的内部状态。
3. 方法调用的自动取址只作用于可寻址值，且掩盖不了方法集的不对称；接口实现必须以方法集为准。
