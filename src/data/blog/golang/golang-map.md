---
title: 'Golang map：Swiss Table、哈希冲突与简易实现'
pubDatetime: 2026-11-20
description: '从 Map/group/table 到 H1 探测与 H2 并行比对，以及一份对齐语义的简易实现。'
author: 'zzh0u'
tags: ['技术', 'Golang']
---

`map` 日常用起来是键值表，变量本身却是一个指向表头的指针，赋值和传参拷的是这份指针。Go 1.25 的内置 map 实现在 `internal/runtime/maps`，设计基于 Swiss Table[^swiss]：多组 8 槽的 group，配上 8 字节控制字，组间用二次探测解决冲突。

## Map、group 与 table

表里面存着多组**键值对**的对应关系，每一组被称作一个 `slot`[^slot]，八个 `slot` 与一个八字节**控制字**组成一个 `group`[^group]，若干 group 加上容量与负载元数据，构成一张 `table`[^table]。一张 map 的 `dirPtr` 指向 directory[^dir]，按哈希前缀选出 `table`：

```
   Map.dirPtr
       |
       v
   +----------+----------+----------+----------+
   | *table A | *table A | *table B | *table C |
   +-----+----+----------+----------+----------+
         |
         v
+--------------------------------------------------+
| table                                            |
| growthLeft    capacity    localDepth             |
|                                                  |
| groups                                           |
| +----------------+    +----------------+         |
| | group 0        |    | group 1        |   ...   |
| | ctrl  (8 byte) |    | ctrl  (8 byte) |         |
| | slot0 .. slot7 |    | slot0 .. slot7 |         |
| +----------------+    +----------------+         |
+--------------------------------------------------+
```

directory 的长度是 `1 << globalDepth`，连续几格可以指向同一张 table。每个 group 前面 8 字节是控制字，后面 8 个 slot。把一个 group 放大：

控制字是与八个 slot 对齐的八个字节，每个字节记录对应槽的状态。尚未写入的是空槽，源码常量 `ctrlEmpty`（`0b10000000`）；元素被删除后留下的位置叫墓碑，常量 `ctrlDeleted`（`0b11111110`），它不能改回空槽，否则查找会提前结束。墓碑会计入 `growthLeft`，扩容一节说明这个计数变成 0 时怎么处理。正在占用时，低 7 位保存该键哈希的低 7 位，源码称为 H2。

```
控制字（每个格子 = 1 字节，管下面同一列的 slot）
+--------+--------+--------+--------+--------+--------+--------+--------+
| empty  |  used  |  tomb  | empty  |  used  | empty  | empty  | empty  |  ← 状态：空槽/占用/墓碑
| 0x80   |  H2    |  0xFE  | 0x80   |  H2    | 0x80   | 0x80   | 0x80   |  ← 字节取值；占用时存该键哈希的低 7 位 H2
+--------+--------+--------+--------+--------+--------+--------+--------+
    |        |        |        |        |        |        |        |
    v        v        v        v        v        v        v        v      ← 第 i 个字节对应第 i 个 slot
+--------+--------+--------+--------+--------+--------+--------+--------+
| slot 0 | slot 1 | slot 2 | slot 3 | slot 4 | slot 5 | slot 6 | slot 7 |  ← slot 下标
| empty  |key+elem|  tomb  | empty  |key+elem| empty  | empty  | empty  |  ← 格子内容；占用时放一对 key+elem
+--------+--------+--------+--------+--------+--------+--------+--------+
```

内存里控制字排在前面，八个 slot 紧跟其后。图中上下同一列是相同下标。上图这个 group 的控制字是 `80 H2 FE 80 H2 80 80 80`，对应的 8 个 slot 依次是：空、一对 key 和 elem、墓碑、空、一对 key 和 elem、空、空、空。

控制字的每个字节**只标明对应槽的状态**。查找与分配按 group 推进。一张 map 可挂一张或多张 table，由 directory（`dirPtr`）按哈希前缀选表；元素不超过 8 个时走小 map 优化，`dirPtr` 直接指向单个 group，尚不建 table。

`Map` 和 `table` 是结构体。`group` 没有同名类型，单个 group 由 `groupReference` 指向，若干 group 存储在 `groupsReference` 里，`table.groups` 持有这份数组。`Map.dirPtr` 的静态类型是 `unsafe.Pointer`，正常时候按 `*[dirLen]*table` 来用。

```go
// Go 1.25 $GOROOT/src/internal/runtime/maps/group.go:238-252
type groupReference struct {
	data unsafe.Pointer // 指向一块 group：先是 8 字节控制字，后面紧跟 8 个 slot
}

// group.go:299-308
type groupsReference struct {
	data       unsafe.Pointer // 指向 group 数组
	lengthMask uint64         // group 个数减一；个数恒为 2 的幂
}

// table.go:34-72
type table struct {
	used       uint16          // 已填槽数，即这张表里的元素个数
	capacity   uint16          // 槽位总数，恒为 2 的幂
	growthLeft uint16          // 距下次 rehash 还能再填的槽数；倒计时，墓碑也占额度
	localDepth uint8           // 这张表之上 directory 已用的哈希位数；表还没拆时可以小于 globalDepth
	index      int             // 在 directory 里第一次出现的下标；已卸下时为 -1
	groups     groupsReference // 这张表的 group 数组，长度固定；需要更多空间时整表替换
}

// map.go:195-246
type Map struct {
	used              uint64         // 存活键值对数，不含已删除槽；必须是第一个字段，len(m) 读这个字段
	seed              uintptr        // 这张 map 的哈希种子
	dirPtr            unsafe.Pointer // 正常指向 *[dirLen]*table；小 map（≤8）直接指向单个 group
	dirLen            int            // directory 长度，等于 1<<globalDepth；小 map 时为 0
	globalDepth       uint8          // directory 查找用的哈希前缀位数
	globalShift       uint8          // 从哈希里移出这些位；64 位系统上是 64 - globalDepth
	writing           uint8          // 写入时翻转，用来发现并发写
	tombstonePossible bool           // 是否可能存在墓碑槽
	clearSeq          uint64         // Clear 的调用计数，迭代时用来发现中途清空
}
```

## 哈希冲突怎么解决

上一节第一张图里，`dirPtr` 下面那一排 `*table` 用哈希的高位[^upper]，当作下标。前缀相同的键进同一张 table；挨在一起的两个 `*table A`，是同一张表占着连续的目录槽。

进了这张表，哈希还要按最低的 7 位切一刀。右移丢掉这 7 位，剩下的一段源码叫做 H1，用来在第一张图的 `groups` 里选起始 group，并沿着探测序列走到后面的 group。留下的 7 位源码叫做 H2，写进控制字图里占用槽的那一格，查找时和这一排 8 个字节一起比。

两个键的 H1 低位相同，就从同一个 group 起探。这一组控制字里没有 `0x80` 空槽时，探测跳到下一个 group。控制字节的 H2 相同，只说明控制字图里对应那一列的 key 要再比一次；key 不同，就继续看组里下一个 H2 相同的槽。`matchH2` 一次把这些槽标出来。

```
hash
 ├─ H1 ──► probeSeq ──► groups[i] ──► groups[j] ──► …
 │                         │
 │                         └─ ctrl 字 + 8 个 slot
 └─ H2 ──► 与 ctrl 中 8 字节并行比对
```

落到同一张表之后，探测序列记的是 group 下标。`makeProbeSeq` 用 `h1 & lengthMask` 当起点，`lengthMask` 是 group 个数减一，个数恒为 2 的幂。`next` 每次把步长加一，再和 mask 按位与：第 1 步加 1，第 2 步加 2，第 3 步加 3。后文简易实现里的 `probeIndex` 写成 `i*(i+1)/2`，这是把增量 `1, 2, 3…` 累加成三角数，相对起点的总偏移与一次次调用 `next` 相同。

```go
// Go 1.25 $GOROOT/src/internal/runtime/maps/map.go:183-192
func h1(h uintptr) uintptr { return h >> 7 }
func h2(h uintptr) uintptr { return h & 0x7f }

// table.go:1251-1263
func makeProbeSeq(hash uintptr, mask uint64) probeSeq {
	return probeSeq{
		mask:   mask,
		offset: uint64(hash) & mask,
		index:  0,
	}
}

func (s probeSeq) next() probeSeq {
	s.index++
	s.offset = (s.offset + s.index) & s.mask
	return s
}
```

某一组里 `matchH2` 没有对上 key，又看到空槽，查找就在这里结束。插入也写在这条探测序列上、第一个空槽之前，再往后的 group 里不会有这个键。墓碑不算空槽，探测会继续往下走。删除如果把槽改回 `empty`，夹在后面的键就找不到了，所以要留 `deleted`。

查找大致走：

1. 用 `seed` 算哈希，拆出 H1、H2
2. 大 map 先用哈希高位在 directory 里选出 `table`
3. `makeProbeSeq(h1, lengthMask)` 得到起始 group
4. 对该 group 做 `matchH2(h2)`，命中再比 key
5. 组内有空槽且未找到，说明后面探测序列上也没有；没有空槽则 `seq.next()` 继续

写入时优先复用沿途记下的第一个墓碑槽，其次才用空槽。平均负载约 `maxAvgGroupLoad = 7`（7/8）时触发增长。表不能装满：探测序列的末端必须还能碰到带空槽的 group，查找才知道该停。

## 扩容

`growthLeft` 是上面 `table` 的字段，记录这张表还能再填多少个槽。新插入会把 `growthLeft` 减一。复用墓碑槽时，`PutSlot` 先执行 `t.growthLeft++`，插入完成后再 `t.growthLeft--`，两步抵消，额度不变。存活键和墓碑把 `growthLeft` 减到 0 时，先走 `pruneTombstones`，无法清理足够的墓碑时就进入 `rehash`。这会把活跃的 `slot` 拷到新表。

墓碑不足容量的 10% 时，`pruneTombstones` 直接返回；够 10% 时，先沿每个存活键的探测序列标出仍然要经过的墓碑。这些墓碑必须保留，查找把空槽当结束条件，若把它们清成 `ctrlEmpty`，会打断后面存活键的探测链。能清掉的部分再不足 10% 也返回。真正清除时把不必保留的槽改回 `ctrlEmpty`，并按清掉的个数增加 `growthLeft`。

新表容量按当前容量有不同的行为：

1. `2 * capacity <= maxTableCapacity` 时，调用 `grow`，换成一张容量翻倍的新表，directory 里的位置不变。`capacity` 计的是槽位数；`maxTableCapacity` 是常量，固定 1024 个槽。
2. `2 * capacity > maxTableCapacity` 则调用 `split`，拆成左右两张容量仍为 1024 个槽的表。哈希在 `localDepth` 那一位上为 0 的进左表，为 1 的进右表。`globalDepth` 增加后，directory 用更多哈希前缀位选表，长度是 `1 << globalDepth`。

一次 `rehash` 在返回前把这一张表里还活着的键值对全部拷进新表，directory 里其余的表这一轮保持原样，所以整张 map 是一张表一张表地变大。迭代器仍握着开始时的旧表，避免同一个键返回两次；值有没有被改或删，要到新表再查。遍历顺序不稳定，遍历过程中也不要做与迭代器语义冲突的写入。

```go
// Go 1.25 $GOROOT/src/internal/runtime/maps/table.go

// table.go:266
func (t *table) PutSlot(typ *abi.SwissMapType, m *Map, hash uintptr, key unsafe.Pointer) (unsafe.Pointer, bool) {
		if firstDeletedGroup.data != nil {
			g = firstDeletedGroup
			i = firstDeletedSlot
			t.growthLeft++ // 下面会再减一次，两步抵消。
		}

		// 没有剩余额度时，先尝试清掉一些墓碑。
		if t.growthLeft == 0 {
			t.pruneTombstones(typ, m)
		}

		if t.growthLeft > 0 {
			slotKey := g.key(typ, i)
			if typ.IndirectKey() {
				kmem := newobject(typ.Key)
				*(*unsafe.Pointer)(slotKey) = kmem
				slotKey = kmem
			}
			typedmemmove(typ.Key, slotKey, key)

			slotElem := g.elem(typ, i)
			if typ.IndirectElem() {
				emem := newobject(typ.Elem)
				*(*unsafe.Pointer)(slotElem) = emem
				slotElem = emem
			}

			g.ctrls().set(i, ctrl(h2(hash)))
			t.growthLeft--
			t.used++
			m.used++

			t.checkInvariants(typ, m)
			return slotElem, true
		}

		t.rehash(typ, m)
		return nil, false

// table.go:508-588
func (t *table) pruneTombstones(typ *abi.SwissMapType, m *Map) {
	if t.tombstones()*10 < t.capacity { // 
		// 少于容量的 10%，墓碑太少，不值得清理。
		return
	}

	// 位图：标出墓碑仍需保留的 group。
	var needed [(maxTableCapacity/abi.SwissMapGroupSlots + 31) / 32]uint32

	// 沿每个已占用槽的探测序列走一遍。
	for i := uint64(0); i <= t.groups.lengthMask; i++ {
		g := t.groups.group(typ, i)
		match := g.ctrls().matchFull()
		for match != 0 {
			j := match.first()
			match = match.removeFirst()
			key := g.key(typ, j)
			if typ.IndirectKey() {
				key = *((*unsafe.Pointer)(key))
			}
			if !typ.Key.Equal(key, key) {
				// 键与自身不相等。查找不会去找这些键，只在迭代时遇到，
				// 所以可以随时打断它们的探测序列。
				continue
			}
			// 沿这个键的探测序列走。
			// 途中必须经过的墓碑 group 标为需要保留。
			hash := typ.Hasher(key, m.seed)
			for seq := makeProbeSeq(h1(hash), t.groups.lengthMask); ; seq = seq.next() {
				if seq.offset == i {
					break // 已经走到该元素所在的 group
				}
				g := t.groups.group(typ, seq.offset)
				m := g.ctrls().matchEmptyOrDeleted()
				if m != 0 { // 此时应是 deleted：探测还没找到这个键
					// 把这个 group 的墓碑标为需要保留。
					needed[seq.offset/32] |= 1 << (seq.offset % 32)
				}
			}
		}
		if g.ctrls().matchEmpty() != 0 {
			// 不含墓碑的 group 也标上，下面就不会去清它们。
			needed[i/32] |= 1 << (i % 32)
		}
	}

	// 先看能清掉的墓碑够不够补回容量。
	// 这一步是 O(n)，只有清掉的数量对得起这个开销才真正清除。
	cnt := 0
	for i := uint64(0); i <= t.groups.lengthMask; i++ {
		if needed[i/32]>>(i%32)&1 != 0 {
			continue
		}
		g := t.groups.group(typ, i)
		m := g.ctrls().matchEmptyOrDeleted() // 此时应是 deleted
		cnt += m.count()
	}
	if cnt*10 < int(t.capacity) { // 能否补回容量的 10%
		return // 不清除墓碑，交给调用方去扩容。
	}

	// 清掉不需要的墓碑。
	for i := uint64(0); i <= t.groups.lengthMask; i++ {
		if needed[i/32]>>(i%32)&1 != 0 {
			continue
		}
		g := t.groups.group(typ, i)
		m := g.ctrls().matchEmptyOrDeleted() // 此时应是 deleted
		for m != 0 {
			k := m.first()
			m = m.removeFirst()
			g.ctrls().set(k, ctrlEmpty)
			t.growthLeft++
		}
	}
}

// table.go:1134-1141
func (t *table) rehash(typ *abi.SwissMapType, m *Map) {
	newCapacity := 2 * t.capacity
	if newCapacity <= maxTableCapacity {
		t.grow(typ, m, newCapacity)
		return
	}

	t.split(typ, m)
}
```

> Go 1.25 的源码中还留着旧版本 `runtime/map_noswiss.go`，这段旧实现不参与编译，默认构建走 Swiss Table，。之前版本 map 扩容是这样的：
>
> 1. `overLoadFactor`：平均每个桶大约超过 6.5 个元素。`hashGrow` 把桶数翻倍。
> 2. `tooManyOverflowBuckets`：溢出桶大约不少于正常桶。`hashGrow` 走 `sameSizeGrow`，桶数不变，键值对放进新的桶数组，删除留下的空位一起丢掉。
>
> `hashGrow` 只换一套空的桶数组，原来的桶先保留。之后每次 写入 先迁移两个旧桶：本次写操作的键落到的对应旧桶（含它的溢出桶），再加一个还没搬过的旧桶。桶数翻倍时，一个旧桶按哈希多出来的一位拆进两个新桶；等大扩容时，旧桶进到对应的新桶。读操作不触发数据迁移，优先读旧桶数据，然后才回读新桶。全部旧桶搬完，这次扩容结束。

## nil map 与赋值

```go
package main

import "fmt"

func main() {
    var m map[string]int
    fmt.Println(m["a"], len(m)) // 0 0
    delete(m, "a")              // nil 上是空操作
    // m["a"] = 1               // panic: assignment to entry in nil map

    m = make(map[string]int)
    m["a"] = 1
    fmt.Println(m["a"]) // 1

    n := m
    n["b"] = 2
    fmt.Println(m["b"]) // 2，n 与 m 指向同一张 Map
}
```

`var m map[string]int` 的变量里是一个 nil 指针，堆上还没有 `Map`。读键得到零值，`len` 是 0，`delete` 和 `range` 都是空操作。写入要往表头里放元素，指针是 nil，所以 panic。

`make` 分配的就是前文那个 `Map`。`n := m` 拷的是指向这份表头的指针，`n["b"] = 2` 改的是同一张表里的槽。这和切片「拷三个字、共享底层数组」不一样：map 连头都在堆上，变量里只剩一个指针。

## 为什么这样设计

相对旧的桶加溢出链，Swiss Table 把比较和布局都收紧了。每个 group 前面 8 字节控制字挨在一起，`matchH2` 一次比对整组 H2；多数冲突在真正读 key 之前就被滤掉。控制字和 8 个 slot 连续排布，查找先读控制字，再按结果读旁边的 slot，不用再顺着溢出桶的指针跳一次。

扩容以 table 为单位。单张 table 达到上限后拆成两张，一次 `rehash` 只把当前这张表的键拷进新表，directory 里其余表保持原样。directory 记下每一张表，按哈希前缀选出要访问的那一张。

## 简易实现

用「group 控制字 + H2 比对 + 二次探测」解决冲突。哈希函数简化成对 `string` 做 FNV-1a[^fnv]；directory 拆表、墓碑、渐进扩容都略去，只保留单表多 group：

```go
const groupSlots = 8
const ctrlEmpty uint8 = 0b10000000

type slot struct {
    key   string
    value int
}

type group struct {
    ctrl  [groupSlots]uint8
    slots [groupSlots]slot
}

type HashMap struct {
    groups []group
    seed   uint64
    used   int
}

func NewHashMap() *HashMap {
    g := group{}
    for i := range g.ctrl {
        g.ctrl[i] = ctrlEmpty
    }
    return &HashMap{
        groups: []group{g},
        seed:   0x9e3779b9,
    }
}

func (m *HashMap) Len() int { return m.used }

func hashString(s string, seed uint64) uint64 {
    h := seed 
    for i := 0; i < len(s); i++ {
        h ^= uint64(s[i])  // 先异或当前字节
        h *= 0x100000001b3 // 再乘 64 位 FNV 质数
    }
    return h
}

func h1(h uint64) uint64 { return h >> 7 }
func h2(h uint64) uint8  { return uint8(h & 0x7f) }

// 二次探测：mask+1 为 group 个数（2 的幂）
func probeIndex(base, mask, i uint64) uint64 {
    // i*(i+1)/2 是三角数，等于把 next 的增量 1,2,3… 累加起来
    return (base + i*(i+1)/2) & mask
}

func (m *HashMap) Get(key string) (int, bool) {
    h := hashString(key, m.seed)
    top := h2(h)
    mask := uint64(len(m.groups) - 1)
    for i := uint64(0); i <= mask; i++ {
        g := &m.groups[probeIndex(h1(h), mask, i)]
        empty := false
        for j := 0; j < groupSlots; j++ {
            c := g.ctrl[j]
            if c == ctrlEmpty {
                empty = true
                continue
            }
            // 运行时用 matchH2 一次比对整组；这里按槽顺序比 H2。
            if c == top && g.slots[j].key == key {
                return g.slots[j].value, true
            }
        }
        // 本实现不支持删除，故无墓碑，控制字节里没有 ctrlDeleted。
        // 空 slot 在这里可以结束查找；运行时的墓碑不算结束，还要继续读后面的 group。
        if empty {
            return 0, false
        }
    }
    return 0, false
}

func (m *HashMap) Set(key string, value int) {
    // 每个 group 8 个槽，负载到 7/8 就翻倍。
    if m.used >= 7*len(m.groups) {
        m.grow()
    }
    h := hashString(key, m.seed)
    top := h2(h)
    mask := uint64(len(m.groups) - 1)
    for i := uint64(0); i <= mask; i++ {
        g := &m.groups[probeIndex(h1(h), mask, i)]
        var emptyJ = -1 // 当前 group 里第一个空 slot 的下标，-1 表示还没遇到
        for j := 0; j < groupSlots; j++ {
            c := g.ctrl[j]
            if c == top && g.slots[j].key == key {
                g.slots[j].value = value
                return
            }
            if c == ctrlEmpty && emptyJ < 0 {
                emptyJ = j // 只记第一次遇到的空 slot
            }
        }
        if emptyJ >= 0 {
            // 往记下的下标写入 H2、key、value。
            g.ctrl[emptyJ] = top
            g.slots[emptyJ] = slot{key: key, value: value}
            m.used++
            return
        }
        // emptyJ 仍是 -1：这个 group 没有空 slot，继续下一个 group。
    }
    // 正常负载下不应走到这里：表不能 100% 满。
    panic("没有空槽")
}

func (m *HashMap) grow() {
    // 运行时可能整表翻倍，或拆成 directory 里的多张 table。
    // 这里只做单表 group 数量翻倍，再重新 Set。
    old := m.groups
    n := len(old) * 2
    m.groups = make([]group, n)
    for i := range m.groups {
        for j := range m.groups[i].ctrl {
            m.groups[i].ctrl[j] = ctrlEmpty
        }
    }
    m.used = 0
    for i := range old {
        for j := 0; j < groupSlots; j++ {
            if old[i].ctrl[j] == ctrlEmpty {
                continue
            }
            s := old[i].slots[j]
            m.Set(s.key, s.value)
        }
    }
}
```

`Get` 用 `seed` 算出哈希，拆成 H1 和 H2。`probeIndex(base, mask, i)` 在 `i` 从 0 递增时给出一串 group 下标，`base` 传入的是 H1；`Get` 按这些下标依次读取 group，在每个 group 里用 H2 比对 slot 的控制字节。

对当前 group，slot 从 0 检查到 7。控制字节等于 H2 且 key 相同，立刻返回该 slot 的 value。控制字节等于 `ctrlEmpty` 时，把 `empty` 记为 true，继续检查后面的 slot。8 个 slot 都检查完后看 `empty`：为 true，返回找不到，不再读取后面的 group。`empty` 仍为 false，8 个 slot 都已占用，`i` 加 1，读取下一个下标上的 group，重复上述检查。

`Set` 先看 `used`。达到 `7 * group 个数` 就先调用 `grow`，把 group 个数翻倍，后面的 group 下标上仍能遇到空 slot。随后和 `Get` 一样，用 `seed` 拆出 H1、H2，再按 `probeIndex` 给出的下标依次读取 group。

对当前 group，slot 从 0 检查到 7。控制字节等于 H2 且 key 相同，立刻改写 value 并返回，`used` 不变。第一次遇到 `ctrlEmpty` 时，把该 slot 的下标记入 `emptyJ`，继续检查后面的 slot。8 个 slot 都检查完后看 `emptyJ`：已有下标，就把 H2 写入这个 slot 的控制字节，把 key、value 写入这个 slot，`used` 加一。新键留在这一串下标上第一个还有空 slot 的 group，更后面的 group 不会再有它，所以 `Get` 在这里看到空 slot 且 key 没有对上时，就返回找不到。`emptyJ` 仍是 -1，说明 8 个 slot 都已占用，于是 `i` 加 1，读取下一个 group，重复上述检查。写入前把负载限制在 7/8，这些 group 里会留下空 slot，因此不会执行到 `panic("没有空槽")`。

`grow` 把 group 个数翻倍。新分配的每个 group 里，8 个控制字节都写成 `ctrlEmpty`，`used` 清零。然后对旧 group 中控制字节不是 `ctrlEmpty` 的 slot，用其中的 key、value 再次调用 `Set`。group 个数变了，`probeIndex` 的下标随之改变，这些键值要按新的 group 个数重新计算位置。

```go
m := NewHashMap()
m.Set("a", 1)
m.Set("b", 2)
fmt.Println(m.Get("a")) // 1 true
fmt.Println(m.Len())    // 2
```

## 注脚

[^swiss]: Swiss Table 是 Google 提出的哈希表设计。槽位排成连续数组，冲突时顺着探测序列找下一个空位，不另挂链表。Go 再把一张 map 拆成多张 table，用 directory 按哈希前缀选表，以便一张表一张表地扩容。
[^slot]: 键值对，值在源码中写作 `Elem` 而不是更常见的 `value`。
[^group]: group 由八个 slot 与一个八字节控制字组成，查找与分配按这个为单位推进。
[^table]: table 由若干 group 加上容量与负载元数据构成。
[^dir]: `dirPtr` 指向的一张 `*table` 数组，长度是 `dirLen`。名称来自源码注释，对应可扩展哈希（extendible hashing）里用哈希高位做下标的表目录。
[^upper]: 高位是把哈希写成二进制时靠左的那些位。
[^fnv]: FNV-1a 是一种轻量、快速、实现简单的哈希算法，从 `seed` 出发，按字符串从左到右处理每个字节。当前哈希先和这个字节异或，改动落在最低 8 位；再乘 64 位质数 `0x100000001b3`，把这 8 位里的差异摊进整个 64 位。下一个字节又只异或新的最低 8 位，前面字节的影响留在更高位。整串走完得到一个 `uint64`，再拆成 H1、H2。
