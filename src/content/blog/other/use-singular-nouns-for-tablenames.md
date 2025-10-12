---
title: '[译]用单数名词作为数据库表名'
pubDate: 2025-10-12
description: '用单数名词作为数据库表名'
author: 'zzh0u'
tags: ["翻译","转载","技术","数据库"]
---

> 原文链接：[https://www.teamten.com/lawrence/programming/use-singular-nouns-for-database-table-names.html](https://www.teamten.com/lawrence/programming/use-singular-nouns-for-database-table-names.html)

在关系型数据库圈子里，从未停止过对一个问题的争论：表名到底该用单数还是复数？ 

假如你有一张表用来存“用户”，那它应该叫 `user` 还是 `users`？

支持复数的理由很直观：

1. 表里存的不止一个用户。  
2. 在 `FROM` 子句里读起来顺口：  
  ```sql
  SELECT id, name
  FROM users;
  ```

支持单数的理由则更微妙：

1. 严格来说，我们并不是在给一张表起名，而是在给一个关系起名。我们描述的是用户 ID、姓名、地址...之间的关联关系，而关联用户数据的关系只有一个。只不过定义完这个关系后，我们可以用它存放很多用户罢了。

2. 在 SQL 的其他地方读起来更自然：  
   ```sql
   SELECT id, name
   FROM user
   JOIN country ON user.country_id = country.id
   WHERE country.name = 'Canada';
   ```
   如果写成 `users.country_id`，就会显得别扭。

3. 代码里对应的类名是单数（`User`）。于是表名用复数就会出现不一致；很多 ORM（例如 Rails）还会自动把类名再“复数化”，结果你偶尔会看到 `addresss` 这种尴尬的表名。

4. 有些关系本身已经是复数。假设你有个类叫 `UserFacts`，用来存用户的杂项信息（年龄、最喜欢的颜色等），数据库表该叫什么？一旦遇到这种例外，整个命名体系就崩了。

最后这条理由最有力——只要有一个例外，就能毁掉整套命名规则的一致性。用单数，现在不会踩坑，将来也不会。