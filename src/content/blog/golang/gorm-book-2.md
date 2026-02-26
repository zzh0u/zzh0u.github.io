---
title: 'Gorm 学习笔记-2'
pubDate: 2025-07-08
description: '学习有关 Gorm 的知识'
author: 'zzh0u'
tags: ["技术","Golang","Gorm","PostgreSQL"]
---

这篇笔记紧跟第一篇的内容，继续学习 Gorm 的相关操作。此外，[GORM 官方中文文档](https://gorm.io/zh_CN/docs/)也写得非常详细，这篇笔记大多参考官方文档，并在其基础上适当精炼。上一篇笔记我们进行到连接数据库，这一篇我们跳过无聊的 CURD 操作。

不过值得注意的是，在使用 Where 进行查询时，Gorm 仅会查询非零值，这意味着数据库中的 0、false、' ' 等值不会被查询到。如果有字段为上述值，也不会用于构建查询条件。譬如：

```go
db.Where(&User{Name: "zzh0u", Age: 0}).Find(&users)
// 执行 SELECT * FROM users WHERE name = "zzh0u";
// 而非 SELECT * FROM users WHERE name = "zzh0u" AND age = 0;
```

如果要在查询条件中包含零值，可以使用 `map` 来查询，这样将包含所有键值作为查询条件。譬如：

```go
db.Where(map[string]interface{}{"name": "zzh0u", "age": 0}).Find(&users)
// 执行 SELECT * FROM users WHERE name = "zzh0u" AND age = 0;
```

## 事务处理

事务确保一系列数据库操作要么全部成功，要么全部失败。Gorm 提供了简单的事务支持。

### 基本事务

```go
// 开始事务
tx := db.Begin()

// 在事务中执行数据库操作
if err := tx.Create(&user).Error; err != nil {
  // 发生错误时回滚事务
  tx.Rollback()
  return err
}

if err := tx.Create(&profile).Error; err != nil {
  tx.Rollback()
  return err
}

// 提交事务
return tx.Commit().Error
```

### 使用事务闭包

Gorm 也支持使用闭包进行事务处理，更加简洁：

```go
err := db.Transaction(func(tx *gorm.DB) error {
  // 在事务中执行多个数据库操作
  if err := tx.Create(&user).Error; err != nil {
    return err  // 返回任何错误都会回滚事务
  }
  
  if err := tx.Create(&profile).Error; err != nil {
    return err
  }
  
  // 返回nil提交事务
  return nil
})
```

## 高级查询技巧

### 子查询

子查询允许在一个查询中嵌套另一个查询：

```go
// 查找发表文章数量大于5的用户
db.Where("id IN (?)", db.Table("articles").Select("user_id").Group("user_id").Having("count(*) > ?", 5)).Find(&users)
```

### 原生SQL

有时需要执行原生SQL查询：

```go
// 执行原生SQL
db.Raw("SELECT id, name FROM users WHERE age > ?", 20).Scan(&result)

// 执行SQL并获取第一条结果
db.Raw("SELECT name FROM users WHERE id = ?", 1).Scan(&name)
```

## 性能优化

### 批量插入

批量插入比单条插入效率高：

```go
var users = []User{
  {Name: "张三"},
  {Name: "李四"},
  {Name: "王五"},
}

// 一次插入多条记录
db.Create(&users)
```

### 索引提示

Gorm 允许在查询时使用索引提示：

```go
// 使用索引提示
db.Clauses(hints.UseIndex("idx_user_name")).Where("name = ?", "张三").Find(&users)
```
