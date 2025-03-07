---
title: '写题记录-卖月饼'
pubDate: 2024-09-14
description: 'PAT 乙级真题练习——买月饼'
author: 'zzh0u'
tags: ["技术","Golang","写题记录"]
---

> 原题地址：[https://www.nowcoder.com/pat/6/problem/4046](https://www.nowcoder.com/pat/6/problem/4046)

这个题比较简单，没有特别多的弯弯绕绕，唯一要走注意的就是，题目中没有说每个月饼的单价，我们需要先计算出每个月饼的单价，然后根据单价从贵到便宜依次销售，以此达到最大收益。没啥好说的，直接贴代码：

```go
package main

import (
    "fmt"
    "sort"
)

type Mooncake struct {
    univalent float64
    stock     float64
    price     float64
}

func main() {
    var species, need int
    n, _ := fmt.Scan(&species, &need)

    if n != 2 {
        return
    }

    mooncakes := make([]Mooncake, species)

    for i := 0; i < species; i++ {
        fmt.Scan(&mooncakes[i].stock)
    }
    for i := 0; i < species; i++ {
        fmt.Scan(&mooncakes[i].price)
        mooncakes[i].univalent = mooncakes[i].price / mooncakes[i].stock
    }

    sort.Slice(mooncakes, func(i, j int) bool {
        return mooncakes[i].univalent > mooncakes[j].univalent
    })

    var Profit float64 = 0
    var remainDemand = float64(need)

    for i := range mooncakes {
        if remainDemand == 0 {
            break
        }
        // sellAmount := min(mooncakes[i].stock, float64(remainDemand))
        // Profit += sellAmount * mooncakes[i].univalent
        // remainDemand -= int(sellAmount)
        if remainDemand >= mooncakes[i].stock {
            Profit += mooncakes[i].price
            remainDemand -= mooncakes[i].stock
        } else if remainDemand < mooncakes[i].stock {
            Profit += mooncakes[i].univalent * remainDemand
            remainDemand = 0
        }
    }
    fmt.Printf("%.2f\n", Profit)

}

```

