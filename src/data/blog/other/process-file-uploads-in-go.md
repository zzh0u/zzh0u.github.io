---
title: '[译]Go 中处理文件上传的正确姿势'
pubDatetime: 2026-04-04
description: '从限制文件大小到多文件上传，聊聊 Go 中处理文件上传的各种场景和踩坑点'
author: 'zzh0u'
tags: ["技术","Golang","翻译"]
---

> 原文链接：[How to process file uploads in Go](https://freshman.tech/file-upload-golang/)，有删减，已将源代码上传到 [GitHub Gist](https://gist.github.com/zzh0u/9b1b75c91e7db80f57b5f0e67de631de)。

处理用户上传的文件是 Web 开发中的一项常见任务，你很可能时不时需要开发一个处理此任务的服务。本文将指导你完成在 Go Web 服务器上处理文件上传的过程，并讨论常见需求，如多文件上传、进度报告和限制文件大小。

在本教程中，我们将介绍 Go 中的文件上传，并涵盖常见需求，如设置大小限制、文件类型限制和进度报告。你可以在 GitHub 上找到本教程的完整源代码。

## 开始

首先有一个 `main.go` 文件，其中包含以下代码：

```go
package main

import (
	"log"
	"net/http"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "text/html")
	http.ServeFile(w, r, "index.html")
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", indexHandler)
	mux.HandleFunc("/upload", uploadHandler)

	if err := http.ListenAndServe(":4500", mux); err != nil {
		log.Fatal(err)
	}
}
```

此代码用于在端口 4500 启动服务器，并在根路由渲染 `index.html` 文件。在 `index.html` 文件中，我们有一个包含文件输入的表单，它向服务器上的 `/upload` 路由发送 POST 请求。

**index.html**
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>File upload demo</title>
</head>

<body>
    <form id="form" enctype="multipart/form-data" action="/upload" method="POST">
        <input class="input file-input" type="file" name="file" multiple />
        <button class="button" type="submit">Submit</button>
    </form>
</body>

</html>
```

接下来，让我们编写处理浏览器文件上传所需的代码。

## 设置最大文件大小

有必要限制文件上传的最大大小，以避免客户端意外或恶意上传巨型文件而浪费服务器资源的情况。在本节中，我们将设置最大上传限制为 1MB，如果上传的文件超过限制则显示错误。一种常见的方法是检查 `Content-Length` 请求头，并与允许的最大文件大小进行比较，看是否超限。

```go
if r.ContentLength > MAX_UPLOAD_SIZE {
	http.Error(w, "The uploaded image is too big. Please use an image less than 1MB in size", http.StatusBadRequest)
	return
}
```

我不推荐这种方法，因为 `Content-Length` 头可以在客户端被修改为任意值，而不管实际文件大小。最好使用下面演示的 [http.MaxBytesReader](https://pkg.go.dev/net/http@go1.18.6#MaxBytesReader) 方法。用以下代码片段更新你的 `main.go` 文件：

```go
const MAX_UPLOAD_SIZE = 1024 * 1024 // 1MB

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, MAX_UPLOAD_SIZE)
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		http.Error(w, "The uploaded file is too big. Please choose an file that's less than 1MB in size", http.StatusBadRequest)
		return
	}
}
```

`http.MaxBytesReader()` 方法用于限制传入请求体的大小。对于单文件上传，限制请求体的大小可以很好地近似限制文件大小。`ParseMultipartForm()` 方法随后将请求体解析为 `multipart/form-data`，最大内存参数为传入值。如果上传的文件大于 `ParseMultipartForm()` 的参数，将会发生错误。

## 保存上传的文件

接下来，让我们检索上传的文件并将其保存到文件系统。将以下代码片段添加到 `uploadHandler()` 函数的末尾：

```go
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// 为简洁起见省略前文

	// FormFile 的参数必须与前端文件输入的 name 属性匹配
	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	defer file.Close()

	// 如果 uploads 文件夹尚不存在，则创建它
	err = os.MkdirAll("./uploads", os.ModePerm)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 在 uploads 目录中创建新文件
	dst, err := os.Create(fmt.Sprintf("./uploads/%d%s", time.Now().UnixNano(), filepath.Ext(fileHeader.Filename)))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	defer dst.Close()

	// 将上传的文件复制到文件系统的指定目标位置
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Upload successful")
}
```

## 限制上传文件的类型

假设我们想将上传文件的类型限制为仅图片，特别是仅 JPEG 和 PNG 图片。我们需要检测上传文件的 MIME 类型，然后将其与允许的 MIME 类型进行比较，以确定服务器是否应继续处理上传。你可以在文件输入中使用 `accept` 属性来定义应接受的文件类型，但你仍需要在服务器端进行双重检查，以确保输入未被篡改。将以下代码片段添加到 `uploadHandler` 函数中：

```go
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// 为简洁起见省略前文

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	defer file.Close()

	buff := make([]byte, 512)
	_, err = file.Read(buff)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	filetype := http.DetectContentType(buff)
	if filetype != "image/jpeg" && filetype != "image/png" {
		http.Error(w, "The provided file format is not allowed. Please upload a JPEG or PNG image", http.StatusBadRequest)
		return
	}

	_, err := file.Seek(0, io.SeekStart)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 为简洁起见省略后文
}
```

`DetectContentType()` 方法由 `http` 包提供，用于检测给定数据的内容类型。它最多考虑前 512 字节的数据来确定 MIME 类型。这就是为什么我们在将其传递给 `DetectContentType()` 方法之前，将文件的前 512 字节读取到一个空缓冲区。如果结果的 `filetype` 既不是 JPEG 也不是 PNG，则返回错误。

当我们读取上传文件的前 512 字节以确定内容类型时，底层文件流指针向前移动 512 字节。稍后调用 `io.Copy()` 时，它会从该位置继续读取，导致图片文件损坏。`file.Seek()` 方法用于将指针返回到文件的开头，以便 `io.Copy()` 从头开始。

## 处理多个文件

如果你想处理客户端一次发送多个文件的情况，你可以手动解析并遍历每个文件，而不是使用 `FormFile()`。打开文件后，其余代码与单文件上传相同。

```go
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 32 MB 是 FormFile() 使用的默认值
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取 fileHeaders 的引用
	// 它们仅在 ParseMultipartForm 被调用后才可以访问
	files := r.MultipartForm.File["file"]

	for _, fileHeader := range files {
		// 将每个上传文件的大小限制为 1MB
		// 为防止总大小超过指定值，在调用 ParseMultipartForm() 之前
		// 使用 http.MaxBytesReader() 方法
		if fileHeader.Size > MAX_UPLOAD_SIZE {
			http.Error(w, fmt.Sprintf("The uploaded image is too big: %s. Please use an image less than 1MB in size", fileHeader.Filename), http.StatusBadRequest)
			return
		}

		// 打开文件
		file, err := fileHeader.Open()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		defer file.Close()

		buff := make([]byte, 512)
		_, err = file.Read(buff)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		filetype := http.DetectContentType(buff)
		if filetype != "image/jpeg" && filetype != "image/png" {
			http.Error(w, "The provided file format is not allowed. Please upload a JPEG or PNG image", http.StatusBadRequest)
			return
		}

		_, err = file.Seek(0, io.SeekStart)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		err = os.MkdirAll("./uploads", os.ModePerm)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		f, err := os.Create(fmt.Sprintf("./uploads/%d%s", time.Now().UnixNano(), filepath.Ext(fileHeader.Filename)))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		defer f.Close()

		_, err = io.Copy(f, file)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	fmt.Fprintf(w, "Upload successful")
}
```

## 报告上传进度

接下来，让我们添加文件上传的进度报告。我们可以利用 `io.TeeReader()` 方法来计算从 `io.Reader`（此处为每个文件）读取的字节数。方法如下：

**main.go**
```go
// Progress 用于跟踪文件上传的进度
// 它实现了 io.Writer 接口，因此可以传递给 io.TeeReader()
type Progress struct {
	TotalSize  int64
	BytesRead int64
}

// Write 用于满足 io.Writer 接口
// 它不是写入到某个地方，而只是简单地在每次读取时累加总字节数
func (pr *Progress) Write(p []byte) (n int, err error) {
	n, err = len(p), nil
	pr.BytesRead += int64(n)
	pr.Print()
	return
}

// Print 每次调用 Write 时显示文件上传的当前进度
func (pr *Progress) Print() {
	if pr.BytesRead == pr.TotalSize {
		fmt.Println("DONE!")
		return
	}

	fmt.Printf("File upload in progress: %d\n", pr.BytesRead)
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// 为简洁起见省略前文

	for _, fileHeader := range files {
		// [..]

		pr := &Progress{
			TotalSize: fileHeader.Size,
		}

		_, err = io.Copy(f, io.TeeReader(file, pr))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	fmt.Fprintf(w, "Upload successful")
}
```

## 总结

这总结了我们处理 Go 中文件上传的工作。别忘了在 [GitHub Gist](https://gist.github.com/zzh0u/9b1b75c91e7db80f57b5f0e67de631de) 上获取本教程的完整源代码。如果你有任何问题或建议，欢迎在下方留言。感谢阅读，祝你编程愉快！
