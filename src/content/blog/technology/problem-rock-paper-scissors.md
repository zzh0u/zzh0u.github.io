---
title: '写题记录-锤子剪刀布'
pubDate: 2024-09-12
description: 'PAT 乙级真题练习——锤子剪刀布'
author: 'zzh0u'
tags: ["技术","Golang","写题记录"]
---

> 原题地址：[https://www.nowcoder.com/pat/6/problem/4044](https://www.nowcoder.com/pat/6/problem/4044)

题目相对简单，给出了输入轮次 `N`，只需要按照题目所描述的逻辑逐个实现即可。

首先实现猜拳比较的函数：

```go
func compare(a, b string) int {
    if a == b {
        return 0
    }

    switch {
	case (a == "C" && b == "J") || (a == "J" && b == "B") || (a == "B" && b == "C"):
		return 1
	case (a == "C" && b == "B") || (a == "J" && b == "C") || (a == "B" && b == "J"):
		return -1
	default:
		return 0
	}
}
```

再实现甲乙双方各手势的胜率函数：

```go
func updateWinrate(player string, cnt []int) {
	switch player {
	case "C":
		cnt[0]++
	case "J":
		cnt[1]++
	case "B":
		cnt[2]++
    }
}
```

最后输出胜率最高手势这部分有些麻烦，为了代码可读性，将其封装成若干个函数：

```go
func winrate_output() {
	Amax := max(A_cnt[0], A_cnt[1], A_cnt[2])
	Bmax := max(B_cnt[0], B_cnt[1], B_cnt[2])
	printMax(Amax, A_cnt, "C", "J", "B")
	fmt.Print(" ")
	printMax(Bmax, B_cnt, "C", "J", "B")

}

func printMax(maxVal int, cnt []int, c, j, b string) {
	// 检查是否有多个最大值
	hasMultipleMax := (boolToInt(cnt[0] == maxVal) + boolToInt(cnt[1] == maxVal) + boolToInt(cnt[2] == maxVal)) > 1

	if hasMultipleMax {
		// 输出所有最大值对应的字符
		if cnt[2] == maxVal {
			fmt.Print(b)
		} else if cnt[0] == maxVal {
			fmt.Print(c)
		} else if cnt[1] == maxVal {
			fmt.Print(j)
		}
	} else {
		// 输出单个最大值对应的字符
		switch {
		case maxVal == cnt[0]:
			fmt.Print(c)
		case maxVal == cnt[1]:
			fmt.Print(j)
		case maxVal == cnt[2]:
			fmt.Print(b)
		}
	}
}

func max(nums ...int) int {
	maxVal := nums[0]
	for _, num := range nums {
		if num > maxVal {
			maxVal = num
		}
	}
	return maxVal
}
```
最后加上主函数和一些声明，小小优化一下，完整代码如下：

```go
package main

import (
	"fmt"
)

// C: 石头, J: 剪刀, B: 布
var A_cnt = []int{0, 0, 0}
var B_cnt = []int{0, 0, 0}


func compare(a, b string) int {
	if a == b {
		return 0
	}
	winMap := map[string]string{"C": "J", "J": "B", "B": "C"}
	if winMap[a] == b {
		return 1
	}
	return -1
}

func updateWinrate(player string, cnt []int) {
	switch player {
	case "C":
		cnt[0]++
	case "J":
		cnt[1]++
	case "B":
		cnt[2]++
	}
}

func max(nums ...int) int {
	maxVal := nums[0]
	for _, num := range nums {
		if num > maxVal {
			maxVal = num
		}
	}
	return maxVal
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func printMax(maxVal int, cnt []int, c, j, b string) {
	// 检查是否有多个最大值
	hasMultipleMax := (boolToInt(cnt[0] == maxVal) + boolToInt(cnt[1] == maxVal) + boolToInt(cnt[2] == maxVal)) > 1

	if hasMultipleMax {
		// 输出所有最大值对应的字符
		if cnt[2] == maxVal {
			fmt.Print(b)
		} else if cnt[0] == maxVal {
			fmt.Print(c)
		} else if cnt[1] == maxVal {
			fmt.Print(j)
		}
	} else {
		// 输出单个最大值对应的字符
		switch {
		case maxVal == cnt[0]:
			fmt.Print(c)
		case maxVal == cnt[1]:
			fmt.Print(j)
		case maxVal == cnt[2]:
			fmt.Print(b)
		}
	}
}

func winrate_output() {
	Amax := max(A_cnt[0], A_cnt[1], A_cnt[2])
	Bmax := max(B_cnt[0], B_cnt[1], B_cnt[2])
	printMax(Amax, A_cnt, "C", "J", "B")
	fmt.Print(" ")
	printMax(Bmax, B_cnt, "C", "J", "B")

}

func main() {
	var N int
	a_win, b_win, equl := 0, 0, 0
	var a, b string
	fmt.Scanf("%d", &N)
	for i := 0; i < N; i++ {
		fmt.Scanf("%s %s", &a, &b)
		switch compare(a, b) {
		case 1:
			a_win++
			updateWinrate(a, A_cnt)
		case -1:
			b_win++
			updateWinrate(b, B_cnt)
		case 0:
			equl++
		}
	}

	fmt.Println(a_win, equl, b_win)
	fmt.Println(b_win, equl, a_win)
	winrate_output()
}
```
