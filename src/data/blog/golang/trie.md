---
title: 'Go 实现前缀树（Trie）'
pubDatetime: 2026-04-28
description: '从基础实现到工程优化，完整梳理前缀树在 Go 中的实现方式。'
author: 'zzh0u'
tags: ['技术', 'Golang', '数据结构']
---

前缀树（Trie，又称字典树）是一种专门用于处理字符串的多叉树结构。它的核心特点是：**从根节点到任意节点的路径上的字符连接起来，构成一个字符串前缀**。这种结构让字符串的查找、插入、前缀匹配等操作的时间复杂度仅与字符串长度相关，而与存储的数据量无关。

## 一、基础实现

前缀树的核心是节点定义。每个节点需要存储子节点引用和是否为单词结尾的标记：

```go
// Trie 前缀树结构
type Trie struct {
    root *TrieNode
}

// TrieNode 前缀树节点
type TrieNode struct {
    next  [26]*TrieNode // 子节点数组，索引 0-25 对应 a-z
    isEnd bool          // 标记是否是一个完整单词的结尾
}

func (t *Trie) Insert(word string) {
    node := t.root
    for _, w := range word {
        if node.next[w-'a'] == nil {
            node.next[w-'a'] = &TrieNode{}
        }
        node = node.next[w-'a']
    }
    node.isEnd = true // 标记单词结尾
}

// Search 查找完整单词是否存在
func (t *Trie) Search(word string) bool {
    node := t.root
    for _, w := range word {
        if node.next[w-'a'] == nil {
            return false
        }
        node = node.next[w-'a']
    }
    return node.isEnd
}

// StartsWith 查找是否有以指定前缀开头的单词
func (t *Trie) StartsWith(prefix string) bool {
    node := t.root
    for _, w := range prefix {
        if node.next[w-'a'] == nil {
            return false
        }
        node = node.next[w-'a']
    }
    return true
}

func main() {
    trie := &Trie{root: &TrieNode{}}

    // 插入数据
    words := []string{"go", "golang", "google", "good", "gopher"}
    for _, word := range words {
        trie.Insert(word)
    }

    // 查找测试
    fmt.Println("Search 'go':", trie.Search("go"))             // true
    fmt.Println("Search 'goo':", trie.Search("goo"))           // false
    fmt.Println("StartsWith 'goo':", trie.StartsWith("goo"))   // true
    fmt.Println("StartsWith 'java':", trie.StartsWith("java")) // false
}
```

## 二、进阶功能：自动补全

实际应用中，前缀树最常见的用途之一是实现搜索自动补全。我们需要一个方法，给定前缀，返回所有以该前缀开头的单词：

```go
// AutoComplete 返回所有以 prefix 开头的单词
func (t *Trie) AutoComplete(prefix string) []string {
    node := t.root
    for _, w := range prefix {
        if node.next[w-'a'] == nil {
            return nil
        }
        node = node.next[w-'a']
    }

    var results []string
    t.dfs(node, prefix, &results)
    return results
}

// dfs 深度优先遍历收集所有单词
func (t *Trie) dfs(node *TrieNode, prefix string, results *[]string) {
    if node.isEnd {
        *results = append(*results, prefix)
    }

    for i, child := range node.next {
        if child != nil {
            t.dfs(child, prefix+string('a'+byte(i)), results)
        }
    }
}

func main() {
    trie := &Trie{root: &TrieNode{}}
    words := []string{"go", "golang", "google", "good", "gopher", "game"}
    for _, word := range words {
        trie.Insert(word)
    }

    fmt.Println("AutoComplete 'go':", trie.AutoComplete("go"))
    // [go golang google good gopher]

    fmt.Println("AutoComplete 'goo':", trie.AutoComplete("goo"))
    // [google good]
}
```

## 三、工程优化方案

### 1. 扩展支持：使用 map 支持 Unicode

如果需要在基础数组实现上支持 Unicode 字符（如中文），可以将数组改为 map。使用 map 可以支持任意 Unicode 字符，不限于英文字母，而且只存储实际出现的字符分支，节省稀疏数据的空间。

```go
// UnicodeTrieNode 支持 Unicode 的节点
type UnicodeTrieNode struct {
    children map[rune]*UnicodeTrieNode
    isEnd    bool
}

func NewUnicodeTrieNode() *UnicodeTrieNode {
    return &UnicodeTrieNode{
        children: make(map[rune]*UnicodeTrieNode),
        isEnd:    false,
    }
}
```

### 2. 删除操作实现

```go
// Delete 从树中删除单词
func (t *Trie) Delete(word string) bool {
    return t.deleteHelper(t.root, word, 0)
}

// deleteHelper 递归辅助函数，返回值表示当前节点是否可以被删除
func (t *Trie) deleteHelper(node *TrieNode, word string, index int) bool {
    if index == len(word) {
        // 到达单词结尾
        if !node.isEnd {
            return false // 单词不存在
        }
        node.isEnd = false
        // 如果没有子节点，可以删除
        return t.hasNoChildren(node)
    }

    idx := word[index] - 'a'
    child := node.next[idx]
    if child == nil {
        return false // 单词不存在
    }

    shouldDeleteChild := t.deleteHelper(child, word, index+1)
    if shouldDeleteChild {
        node.next[idx] = nil
        // 如果当前节点不是其他单词的结尾且没有子节点，可以删除
        return !node.isEnd && t.hasNoChildren(node)
    }
    return false
}

// hasNoChildren 检查节点是否有子节点
func (t *Trie) hasNoChildren(node *TrieNode) bool {
    for i := 0; i < 26; i++ {
        if node.next[i] != nil {
            return false
        }
    }
    return true
}
```

### 3. 并发安全版本

在高并发场景下，需要加锁保护，其他实现逻辑和正常的前缀树相同。这里要考虑在实际项目中，锁的作用域和影响范围。这里使用读写锁（`sync.RWMutex`）是因为读操作远多于写操作的场景下，可以让多个读操作并行执行。

```go
import "sync"

// ConcurrentTrie 并发安全的前缀树
type ConcurrentTrie struct {
    root *TrieNode
    mu   sync.RWMutex
}

func NewConcurrentTrie() *ConcurrentTrie {
    return &ConcurrentTrie{root: &TrieNode{}}
}

func (t *ConcurrentTrie) Insert(word string) {
    t.mu.Lock()
    defer t.mu.Unlock()

    node := t.root
    for _, w := range word {
        if node.next[w-'a'] == nil {
            node.next[w-'a'] = &TrieNode{}
        }
        node = node.next[w-'a']
    }
    node.isEnd = true
}

func (t *ConcurrentTrie) Search(word string) bool {
    t.mu.RLock()
    defer t.mu.RUnlock()

    node := t.root
    for _, w := range word {
        if node.next[w-'a'] == nil {
            return false
        }
        node = node.next[w-'a']
    }
    return node.isEnd
}
```

## 五、总结

前缀树在处理字符串集合时有明显的优势：

1. **查找效率稳定** - 时间复杂度只与字符串长度相关，与数据规模无关
2. **前缀匹配天然支持** - 无需额外计算，树结构本身就是前缀的组织方式
3. **空间可优化** - 根据字符集大小选择 map 或数组，平衡时间与空间
4. **扩展性强** - 节点可以存储额外信息（如频率、权重等）支持更多功能

在 Go 中实现时，根据场景选择合适的节点结构：
- 限定字符集（如小写英文字母）：使用数组 `[26]*TrieNode`，访问时间为 O(1)
- 通用场景：使用 `map[rune]*TrieNode` 支持 Unicode
- 高并发：增加读写锁保证线程安全

前缀树不是万能的，当需要存储的字符串没有明显公共前缀时，空间效率会下降。但对于词典、路由表、搜索提示等场景，它是非常合适的选择。
