# Makefile 说明

这个项目用 **GNU Make** 作为构建工具，而不是 `npm run`（npm scripts）。这是 2013 年左右的工具链惯例——当时 `npm run` 尚未成为前端构建标准。

## 文件作用一览

`Makefile` 定义了 4 个核心命令入口：

| 命令 | 作用 |
|------|------|
| `make build` | 完整构建：清理 → 产出 JS 发布包 → 编译测试代码 |
| `make annotate` | 用 docco 从 `infinity.js` 源码注释生成文档页面（输出到 `docs/`） |
| `make clean` | 删除 `build/` 目录 |
| `make build-js` / `make build-test` | 更细的步骤，被 `build` 间接调用 |

## 逐行拆解

```makefile
clean:
	@rm -rf build
```

- **`clean:`** 冒号前面是 target（目标）名，后面（此处为空）是它的依赖。下面缩进的行为 recipe（要执行的命令）。
- **缩进必须用 Tab**，不能用空格，否则 make 报错。
- **`@` 前缀**：执行命令时不回显命令本身，只显示命令的输出。去掉 `@` 则先把指令打印出来再执行。

---

```makefile
build-js:
	@mkdir -p build
	@cp infinity.js ./build/infinity.js
	@./node_modules/.bin/uglifyjs -o ./build/infinity.min.js infinity.js
	@gzip -c ./build/infinity.min.js > ./build/infinity.min.js.gz
```

- 一个 target 下可以有**多行命令**，按顺序执行。
- `mkdir -p`：创建目录（`-p` 表示父目录不存在则一并创建，不存在也不算错）。
- `cp infinity.js ./build/infinity.js`：把未压缩版复制进 `build/`。
- `uglifyjs -o ...infinity.min.js infinity.js`：用 uglify 压缩出 `.min.js`。
- `gzip -c ... > ...min.js.gz`：再生成一份 gzip 压缩版，供服务器直接传输省带宽。
- 注意这里写的是 `./node_modules/.bin/uglifyjs` 的**全路径**，因为 make 不会像 npm 那样把 `node_modules/.bin` 自动加进 PATH。

---

```makefile
annotate:
	@./node_modules/.bin/docco infinity.js
```

- make 的 annotate 入口，等价于 `npx docco infinity.js`——读取 `infinity.js`，把注释渲染成两栏并列的 HTML 文档，输出到 `docs/`。

---

```makefile
build-test:
	@coffee -c test/
```

- 用 coffee 编译器把 `test/` 下的 `.coffee` 测试源码编译成 JS。

---

```makefile
build: clean build-js build-test
```

- **依赖关系**是 make 的精髓：`build` 自己不干活，只是声明「我要先完成 `clean`、`build-js`、`build-test`」。make 会按依赖顺序调度执行。这就是为什么一条 `make build` 能串起整套流程。

---

```makefile
.PHONY: build annotate
```

### `.PHONY` 是干什么的

make 默认把 target 当成**文件名**来管理：只有当这个「文件」不存在、或它的依赖比自己新时，才重新执行命令。但如果磁盘上恰好**真存在一个叫 `build` 的同名文件**，make 就会误判「这文件已存在且没依赖，不用做事」，导致命令被跳过。

`.PHONY` 是一个**内置的特殊 target**，用来声明：「后面这些名字不是文件，是纯命令（伪目标）。无论磁盘上有没有同名文件，**每次执行都无条件运行**，不要用文件时间戳判断。」

- `.PHONY: build annotate` 的意思是：这俩是被用户 `make 调用的入口，永远要执行。
- **不严谨之处**：`clean`、`build-js`、`build-test` 也同样是命令而非文件，但作者只标注了 `build` 和 `annotate`（对外公开的入口），没有全部列出。这不影响正常运行——只有恰好出现同名文件时才有风险，平时一切照常。

### 一句话类比

`.PHONY` 像给函数加类型标注——**它不改变执行逻辑，而是给 make 提供元信息**，避免「磁盘上恰好有个同名文件导致命令被静默跳过」这种隐蔽 bug。

## 为什么用 Makefile 而不是 npm run

- **历史原因**：make 是 Unix 上最古老的构建工具（1977 年就有了），2013 年的前端项目从 C 语言习惯继承很正常。那时 npm scripts 还不够完善，「npm run 作为前端构建标准」是随 React 生态（约 2014-2016）才兴起的。
- **依赖图优势**：make 的「target 依赖 target」比 npm scripts 用 `&&` 字符串串联更声明式、更清晰，尤其适合这种有先后顺序的流水线。

如果改用现代 npm scripts，等价写法是：

```json
"scripts": {
  "clean": "rm -rf build",
  "build-js": "mkdir -p build && cp infinity.js ./build/infinity.js && uglifyjs -o ./build/infinity.min.js infinity.js && gzip -c ./build/infinity.min.js > ./build/infinity.min.js.gz",
  "build": "npm run clean && npm run build-js && npm run build-test"
}
```

区别：npm scripts 靠 `&&` 串联；且 npm 会自动把 `node_modules/.bin` 加进 PATH，脚本里能直接写 `uglifyjs`，不用写全路径。

## 注意：Windows 环境的兼容问题

`Makefile` 里用了 `rm -rf`、`mkdir -p`、`gzip -c` 这些 POSIX 命令，在 Windows 的 cmd / PowerShell 里不可直接使用，需要：

- 在 **Git Bash / MinGW / MSYS2** 环境下运行 `make`，或
- 直接调用命令本身，如 `node_modules\.bin\docco.cmd infinity.js`（绕过 make）
