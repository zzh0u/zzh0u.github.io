---
title: '写题记录-科学计数法'
pubDate: 2024-12-10
description: 'PAT 乙级真题练习——科学计数法'
author: 'zzh0u'
tags: ["技术","Golang","写题记录"]
---

> 题目地址：[https://www.nowcoder.com/pat/6/problem/4050](https://www.nowcoder.com/pat/6/problem/4050)

这是个简单题，不需要任何算法技能，只考对字符串操作的熟练度，额外注意有效位就好了。这里以 -1.23400E-03 为例。

首先判定输入字符串是否以 `+` 或 `-` 开始，并进行初步提取：

```go
sign := ""
if num[0] == '+' || num[0] == '-' {
  sign = string(num[0])
  num = num[1:]
}
// sigh="-"
// num="1.23400E-03"
```

继续分离，分别对[尾数](https://zh.wikipedia.org/zh-cn/%E7%A7%91%E5%AD%A6%E8%AE%B0%E6%95%B0%E6%B3%95)（mantissa）和指数（exponent）进行分离：

```go
parts := strings.Split(num, "E")
if len(parts) != 2 {
  return ""
}
mantissa, exponentStr := parts[0], parts[1]
exponent, err := strconv.Atoi(exponentStr)
if err != nil {
  return ""
}

mantissaParts := strings.Split(mantissa, ".")
if len(mantissaParts) != 2 {
  return ""
}
integerPart, decimalPart := mantissaParts[0], mantissaParts[1]
```

分离完成后，就可以对数据进行处理了，这里要注意分正负号，若 `move` 为负数，则需要在小数点前面填充零：

```go
if sign == "+" {
  // “+” 不输出，所以使用空字符占位
  return formatNumber("", integerPart, decimalPart, exponent)

} else if sign == "-" {
  return formatNumber(sign, integerPart, decimalPart, exponent)

}
return ""

func formatNumber(sign, integerPart, decimalPart string, exponent int) string {
    if exponent < 0 {
        return NegativeExponentNum(sign, integerPart, decimalPart, exponent)
    }
    return PositiveExponentNum(sign, integerPart, decimalPart, exponent)
}

func NegativeExponentNum(sign, integerPart, decimalPart string, exponent int) string {
    move := len(integerPart) + exponent
    if move > 0 {
        return sign + integerPart[:move] + "." + integerPart[move:] + decimalPart
    }
  // 这里 move 为非正数，Repeat 只接收非负数，move == 0 时没有意义。
    zeros := strings.Repeat("0", -move)
    return sign + "0." + zeros + integerPart + decimalPart
}

func PositiveExponentNum(sign, integerPart, decimalPart string, exponent int) string {
    if exponent < len(decimalPart) {
        return sign + integerPart + "." + decimalPart[:exponent] + decimalPart[exponent:]
    }
    return sign + integerPart + decimalPart + strings.Repeat("0", exponent-len(decimalPart))
}

```
