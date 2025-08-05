---
title: '浏览器端数据存储机制'
pubDate: 2025-02-20
description: 'Cookie、Local Storage 和 Session Storage 是在浏览器存储数据的三种机制，了解一些其中的异同'
author: 'zzh0u'
tags: ["技术","web"]
---

### 主要共同点

- 一、存储位置：客户端。三者都用于在客户端（如浏览器）存储数据。数据存储在用户的设备上，因此可以减轻服务器的负担。

- 二、存储方式：键值对。三者都采用键值对（Key-Value）的形式存储数据，例如：`key: "username", value: "JohnDoe"`。

- 三、同源策略限制。受浏览器的同源策略（Same-Origin Policy）限制，数据只能被同一协议、域名和端口的页面访问，例如，`https://example.com` 的存储数据不能被 `https://another.com` 访问。

- 四、操作方式：JavaScript。都可以通过 JavaScript 进行读写操作：

  - Cookie：通过 `document.cookie` 访问。

  - Local Storage：通过 `localStorage` 对象访问。

  - Session Storage：通过 `sessionStorage` 对象访问。

- 五、存储数据格式：字符串（string）。都只能存储字符串类型的数据，如果需要存储对象或数组等复杂数据，需要先将其转换为字符串（如 `JSON.stringify`）。

- 六、安全性限制。都受到浏览器的安全限制：

  - 不能直接存储敏感信息（如密码、信用卡号等），除非经过加密。

  - 可能受到跨站脚本攻击（XSS）的威胁，因此需要谨慎处理存储的数据。

### 主要区别

- 一、生命周期

  - Cookie：可以设置过期时间（`Expires` 或 `Max-Age`），未设置时默认为会话级别（关闭浏览器后失效）。可以手动删除或由浏览器自动删除。

  - Local Storage：数据永久存储在本地浏览器，除非手动清除或通过代码删除。

  - Session Storage：数据仅在当前会话有效，关闭浏览器或标签页后自动清除，刷新页面不会清除数据。

- 二、存储大小

Cookie：通常限制为 4KB 左右。

Local Storage：通常限制为 5MB 或更大。

Session Storage：通常限制为 5MB 或更大。

- 三、与服务器的交互

  - Cookie：每次 HTTP 请求都会自动发送到服务器（通过 `Cookie` 头部），可能影响性能。

  - Local Storage：数据仅存储在客户端，不会自动发送到服务器。

  - Session Storage：数据仅存储在客户端，不会自动发送到服务器。

- 四、作用域

  - Cookie：可通过 `Domain` 和 `Path` 属性设置作用域，可跨标签页和窗口共享。

  - Local Storage：在同一域名下跨标签页和窗口共享。

  - Session Storage：仅在当前标签页或窗口内有效，不跨标签页共享。

- 五、典型用途

  - Cookie：会话管理（如用户登录状态）；个性化设置；跟踪用户行为。

  - Local Storage：长期存储用户偏好或离线数据；缓存静态资源。

  - Session Storage：临时存储表单数据或页面状态；单次会话内的数据共享。

### 总结

- Cookie：适合小数据存储，需与服务器交互的场景。
- Local Storage：适合长期存储较大数据，无需与服务器交互。
- Session Storage：适合临时存储较大数据，仅在会话期间有效。
