---
title: 'Go 项目文件命名规范是什么?'
pubDate: 2025-02-09
description: '写 Go 代码时，总会在各种命名方式中纠结，混乱不堪，于是拜读一些互联网博客后，博采众长，写一份自认为不算太差的命名习惯。'
author: 'zzh0u'
tags: ["Project","Golang"]
---
# Go 项目文件命名规范经验

> 计算机科学中只有两件难事：缓存失效和命名。—— 菲尔·卡尔顿（Phil Karlton）。

在编程世界中，选择正确的命名约定是打开可读和可维护代码大门的重要途径。在使用 Go 语言开发项目时，文件命名是构建清晰项目结构的关键一环，一个合理的文件命名规范不仅能提高开发效率，还能降低团队协作中的沟通成本。

### 目录名

关于 Go 目录命名规范，在网上搜索相关资料，基本能找到如下两条共识：

- 全小写单词。例如 `cmd`、`internal`。
- 必要时可以使用中划线分隔。例如 `kube-scheduler`、`kube-controller-manager`。

项目本身也是一个目录，所以项目名也遵循这两条规范。关于项目本身的的命名，其实也可以是一个代号（如神话人物的名字、游戏角色等），例如 `kratos`、`kubernetes`。

### 包名

对于包名，Go 官方博客给出了参考建议，也是最为权威的规范。在 [Package names](https://go.dev/blog/package-names) 这篇 Go 官方博文中，给出了几条好的包命名原则：

- 一、好的包名应该简短而清晰的，具有描述性。例如 `bufio`（带缓冲的 `I/O`）比 `buf` 或 `buffer` 更好，因为它既简短又具有描述性。
- 二、小写单一单词，简短名词，避免冗余。避免蛇形命名（`under_scores`）或驼峰命名（`mixedCaps`）。例如 `time`、`list`、`http`。
- 三、明智而谨慎的使用缩写，如果缩写包名称会使其产生歧义或不清楚，请不要这样做。例如 `strconv`(string conversion)、`syscall`(system call)、`fmt`(formatted I/O)。
- 四、不要从用户那里窃取好名字，避免给包起一个在客户端代码中常用的名字。例如，带缓冲的 `I/O` 包名叫 `bufio`，而不是 `buf`，因为 `buf` 是表示缓冲区的一个好的变量名，常会出现在客户端程序代码中。
- 五、包名以及包所在的目录名，不要使用复数。例如可以是 `net/url`，而不应是 `net/urls`。
- 六、不要用 `common`、`util`、`shared` 或者 `lib` 这类过于宽泛且无意义的包名。记住，一个包应该只有一个目的，只有一个责任。
- 七、避免不必要的包名冲突，不使用常用名或标准库作为包名。
- 八、不同目录中的包也可以具有相同的名称。例如 `runtime/pprof` 和 `net/http/pprof` 不会产生歧义，客户端代码在导入包时可以重命名（当重命名导入的包时，本地名称同样应遵循与包名称相同的指导原则(lower case, no under_scores or mixedCaps)）。
- 九、按照惯例，包路径的最后一个元素是包名，如果不一致，会对代码阅读者产生困惑。例如 `import golang.org/x/time/rate`，包名为 `rate`。

<br>

Go Team 成员 David Crawshaw 在 [2014 Google I/O talk](https://go.dev/talks/2014/organizeio.slide#6) 中也对包命名规范给出了建议：

- 一、保持包名简短而有意义。
- 二、不要使用下划线，它们会使包名变长。例如 `suffixarray` 而不是 `suffix_array`。
- 三、包的名称是它的类型名和函数名的一部分。例如 `bytes` 包下存在 `Buffer` 结构体，本身而言 `Buffer` 存在二义性，但客户端用户看到的是 `buf := new(bytes.Buffer)`，即包名 + 类型名，解决了二义性的问题。

同目录名规范一样，包名也存在例外的情况：

- 一、例如使用代码生成工具生成的代码包名称可能会存在下划线，个人建议是在导入时将其重命名为适合在 Go 代码中使用的名称。
- 二、以 `_test` 结尾的包名是测试代码包。

正确示例：

```
controller
stringset
tabwriter
```

反向示例：

```
MyUtil
util
time // 与标准库重名
tabWriter
TabWriter
tab_writer
```

### 最后，一些共识性建议：

- 一、采用 `lowercase`，而非 `camelCase` 或 `PascalCase`。
- 二、必要时，目录使用 `kebab-case`，文件使用 `snake_case`。
- 三、`lowercase` 以及 `kebab-case`/`snake_case` 的选择存在模糊的“灰色地带”。

### 书影音

- 书
  - 读完：诡秘之主@爱潜水的乌贼｜★★★★☆
  - 在读：倾城之恋@张爱玲

- 电影
  - 看完：邪不压正｜★★★★☆
  - 看完：海街日记｜★★★★☆
  - 看完：双城之战2｜★★★★☆
  - 看完：好东西｜★★★★☆
  - 看完：困在时间里的父亲｜★★★☆☆
  - 看完：毒液3｜★★★☆☆
  - 看完：解密｜★★★☆☆

- 音乐
  - 在听：勿听@张紫宁&赵紫骅｜★★★★★
  - 在听：未竟@秦勇｜★★★★★

