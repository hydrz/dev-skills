# HTML 报告格式

架构审查报告是操作系统临时目录中的单个自包含 HTML 文件。Tailwind 和 Mermaid 都通过 CDN 引入。Mermaid 适合表达图状结构；手写 div 和内联 SVG 适合表现力更强的示意图（体量图、剖面图）。两者结合使用：全部使用 Mermaid 会让图示显得单调。

## 骨架

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>{{仓库名}} 架构审查</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* Tailwind 不便实现的少量自定义样式：虚线接缝、手绘感箭头等 */
      .seam {
        stroke-dasharray: 4 4;
      }
      .leak {
        stroke: #dc2626;
      }
      .deep {
        background: linear-gradient(135deg, #0f172a, #1e293b);
      }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## 页头

包含仓库名、日期和一个紧凑的图例：实线框表示模块，虚线表示接缝，红色箭头表示泄漏，粗边深色框表示深模块。不写介绍段落，直接进入候选项。

## 候选项卡片

图示承担主要信息。文字简短、平实，并自然地使用 `codebase-design` skill 中的术语。

每个候选项是一个 `<article>`：

- **标题**：简短，点明这次加深的内容（例如“合并订单录入流程”）。
- **徽章行**：推荐强度（`强烈推荐` 用翠绿色，`值得探索` 用琥珀色，`推测性` 用石板灰），加上一个依赖类别标签（`进程内`、`本地可替代`、`端口与适配器`、`mock`）。
- **文件**：等宽字体列表，`font-mono text-sm`。
- **改造前后对比图**：核心内容。左右两列并排。见下文图示方式。
- **问题**：一句话，说明问题出在哪里。
- **方案**：一句话，说明改变什么。
- **收益**：要点列表，每条不超过十个字。例如“测试只针对一个接口”“定价逻辑不再泄漏”“删除 4 个浅包装”。
- **ADR 提示**（如适用）：琥珀色背景框中的一行文字。

不写解释性段落。如果图需要一段文字才能看懂，就重新画图。

## 图示方式

根据候选项选择合适的方式，并混合使用。不要让每张图都长得一样，多样化本身有助于区分候选项。

### Mermaid 图（依赖和调用流程的主要方式）

需要表达“X 调用 Y，Y 又调用 Z，结构很混乱”时，使用 Mermaid 的 `flowchart` 或 `graph`。把图放在 Tailwind 样式的卡片中，与页面风格保持一致。用 classDef 把泄漏的边标红、把深模块标为深色。时序图适合表达“改造前：6 次往返；改造后：1 次”。

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[订单处理] --> B[订单校验]
      B --> C[订单仓储]
      C -.泄漏.-> D[定价客户端]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### 手绘框与箭头（Mermaid 布局不合适时）

模块用带边框和标签的 `<div>` 表示，箭头用绝对定位在相对容器上的内联 SVG `<line>` 或 `<path>` 表示。需要让“改造后”看起来是一个粗边框的深模块、内部细节淡化显示时使用，Mermaid 很难表现这种视觉重量。

### 剖面图（适合多层浅封装）

用堆叠的水平色带（`h-12 border-l-4`）表示一次调用经过的层。改造前：6 层很薄、几乎不做事的封装。改造后：1 条粗色带，标注合并后的职责。

### 体量图（适合“接口和实现一样复杂”）

每个模块画两个矩形：一个表示接口复杂度，一个表示实现复杂度。改造前：接口矩形几乎和实现矩形一样高（浅）。改造后：接口矩形很矮，实现矩形很高（深）。

### 调用折叠图

改造前：把函数调用树画成嵌套框。改造后：同一棵树折叠进一个框中，原来的调用变成内部调用，以淡色显示在框内。

## 样式说明

- 采用简洁的编辑排版风格，而不是企业仪表盘风格。留白充足。标题可以使用衬线字体（`font-serif` 与 stone、slate 色系搭配较好）。
- 克制用色：一个强调色（翠绿或靛蓝），加上红色表示泄漏、琥珀色表示警告。
- 图高约 320px，让改造前后对比图可以并排显示而无需滚动。
- 图内模块标签使用 `text-xs uppercase tracking-wider`，让它看起来像示意图而不是 UI。
- 只引入 Tailwind CDN 和 Mermaid ESM 两个脚本。报告其余部分是静态的：没有应用代码，除 Mermaid 自身渲染外没有交互。

## 首要推荐

用一张更大的卡片展示：候选项名称、一句推荐理由、指向对应卡片的锚点链接。只包含这些内容。

## 表达方式

平实、简洁，架构相关的名词和动词直接使用 `codebase-design` skill 中的术语。简洁不能以牺牲术语准确性为代价。

**描述模块设计时一致使用：** 模块、接口、实现、深度、深、浅、接缝、适配器、杠杆、局部性。

**其他工程词按原义使用：** 组件、服务、API、签名、边界、层都有各自的含义，不要用它们替代上面的术语。例如，一个类只是某个流程中的模块时，写“模块”；它确实是独立部署的服务时，才写“服务”。

**合适的表述：**

- “订单录入模块是浅的：接口几乎等同于实现。”
- “定价逻辑跨过接缝泄漏。”
- “加深后：一个接口，一处测试。”
- “两个适配器让这个接缝真实存在：生产使用 HTTP，测试使用内存。”

**收益要点**用术语说明收获，例如 _“局部性：bug 集中在一个模块”_、_“杠杆：一个接口，服务 N 个调用点”_、_“接口收窄，实现吸收了包装层”_。“更好维护”“代码更干净”没有说明具体收益，改用术语表中的词表达。

不写含糊的表述、不写铺垫，也不写“值得注意的是……”。能写成要点的就写成要点，能删除的要点就删除。某个概念在 `codebase-design` 术语表中没有对应词时，先找一个已有的术语，再考虑创造新词。
