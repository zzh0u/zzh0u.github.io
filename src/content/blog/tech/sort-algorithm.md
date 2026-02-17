---
title: '常见排序算法'
pubDate: 2025-11-20
description: '尝试复现一些排序算法'
author: 'zzh0u'
tags: ["技术","Golang"]
---

## 快速排序 (Quick Sort)

```go
func quickSort(arr []int) {
	if len(arr) <= 1 {
		return
	}
	pivot := arr[0]
	left, right := 0, len(arr)-1
	i := 1
	for i <= right {
		if arr[i] > pivot {
			arr[i], arr[right] = arr[right], arr[i]
			right--
		} else if arr[i] < pivot {
			arr[i], arr[left] = arr[left], arr[i]
			left++
		} else {
			right--
			left++
		}
	}

	quickSort(arr[:right])
	quickSort(arr[right+1:])
}
```

## 归并排序 (Merge Sort)

```go
func mergeSort(arr []int) []int {
	if len(arr) <= 1 {
		return arr
	}
	left := mergeSort(arr[:len(arr)/2])
	right := mergeSort(arr[len(arr)/2:])
	return merge(left, right)
}

func merge(left, right []int) (result []int) {
	result = make([]int, 0, len(left)+len(right))
	l, r := 0, 0
	lenLeft, lenRight := len(left), len(right)
	for l < lenLeft && r < lenRight {
		if left[l] <= right[r] {
			result = append(result, left[l])
			l++
		} else {
			result = append(result, right[r])
			r++
		}
	}
	result = append(result, left[l:]...)
	result = append(result, right[r:]...)
	return
}
```

> 施工中...
