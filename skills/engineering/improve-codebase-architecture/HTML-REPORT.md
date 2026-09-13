# HTML 报告格式

架构评审渲染为操作系统临时目录中的单个自包含 HTML 文件。Tailwind 和 Mermaid 都来自 CDN。Mermaid 可靠地处理图状结构；手工 div 和内联 SVG 处理更有编辑感的图示（质量图、剖面图）。两者混用：全靠 Mermaid 会显得千篇一律。

## 骨架

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>{{仓库名}} 架构评审</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* Tailwind 覆盖不好的小自定义层：虚线接缝、手绘感箭头等 */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
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

仓库名、日期、一个紧凑的图例：实线框 = 模块，虚线 = 接缝，红色箭头 = 泄漏，粗深色框 = 深模块。没有介绍段落，直接进入候选。

## 候选卡片

图示承担主要信息量。文字稀疏、平实，毫不做作地使用术语（来自 `codebase-design` skill）。

每个候选是一个 `<article>`：

- **标题**：简短，点出这次加深（例如"收拢订单录入管线"）。
- **徽章行**：推荐强度（`强烈推荐` = 翠绿，`值得探索` = 琥珀，`推测性` = 石板灰），外加一个依赖类别标签（`进程内`、`本地可替身`、`端口与适配器`、`mock`）。
- **文件**：等宽列表，`font-mono text-sm`。
- **前 / 后对比图**：核心。两列并排。见下方图示模式。
- **问题**：一句话。哪里疼。
- **方案**：一句话。改什么。
- **收益**：要点，每条十个字以内。例如"测试只打一个接口""定价逻辑不再泄漏""删掉 4 个浅包装"。
- **ADR 提示**（如适用）：琥珀色底框里的一行。

不写解释性段落。图需要一段话才能看懂，就重画图。

## 图示模式

挑适合候选的模式，混着用。不要让每张图都长一个样，多样性本身就是重点之一。

### Mermaid 图（依赖 / 调用流的主力）

要表达"X 调 Y 调 Z，看这乱的"时，用 Mermaid 的 `flowchart` 或 `graph`。包在一个 Tailwind 样式的卡片里，别显得像空降的。用 classDef 把泄漏边染红、把深模块染深。时序图很适合表达"之前：6 次往返；之后：1 次"。

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

### 手工框与箭头（Mermaid 的布局跟你作对时）

模块用带边框和标签的 `<div>`，箭头用绝对定位在相对容器上的内联 SVG `<line>` 或 `<path>`。想让"之后"图看起来像一个粗边框的深模块、内部灰掉时用它，Mermaid 画不出那种分量。

### 剖面图（适合层层叠叠的浅）

堆叠水平色带（`h-12 border-l-4`）表示一次调用穿过的层。之前：6 层薄薄的、每层什么都不做。之后：1 条粗色带，标上合并后的职责。

### 质量图（适合"接口和实现一样宽"）

每个模块两个矩形：一个表示接口表面积，一个表示实现。之前：接口矩形几乎和实现矩形一样高（浅）。之后：接口矩形很矮，实现矩形很高（深）。

### 调用图塌缩

之前：函数调用树画成嵌套框。之后：同一棵树塌缩进一个框里，现在变成内部的调用在里面淡淡地显示。

## 样式指引

- 偏编辑风，不要企业仪表盘风。留白充足。标题可选衬线体（`font-serif` 与 stone / slate 很搭）。
- 克制用色：一个强调色（翠绿或靛蓝），加红色表示泄漏、琥珀表示警告。
- 图高约 320px，让前后对比并排放下而不必滚动。
- 图内模块标签用 `text-xs uppercase tracking-wider`，读起来像示意图而不是 UI。
- 只有 Tailwind CDN 和 Mermaid ESM 两个脚本。报告其余部分是静态的：没有应用代码，除 Mermaid 自身渲染外没有交互。

## 首要推荐一节

一张更大的卡片。候选名称、一句为什么、指向其卡片的锚点链接。就这些。

## 语气

平实、简洁，但架构名词和动词直接取自 `codebase-design` skill。简洁不是偏离术语的借口。

**严格使用：** 模块、接口、实现、深度、深、浅、接缝、适配器、杠杆、局部性。

**用它们替换这些说法：** 组件、服务、单元 → 模块；API、签名 → 接口；边界 → 接缝；层、包装（指模块时）→ 模块。

**合适的表述：**

- "订单录入模块是浅的：接口几乎等于实现。"
- "定价跨接缝泄漏。"
- "加深：一个接口，一处测试。"
- "两个适配器让这条接缝成立：生产用 HTTP，测试用内存。"

**收益要点**用术语说明收获：*"局部性：bug 集中在一个模块"*、*"杠杆：一个接口，N 个调用点"*、*"接口收窄，实现吸收了包装层"*。"更好维护""代码更干净"不在术语表里，换成术语表里的词。

不含糊、不清嗓子、不写"值得注意的是……"。能写成要点的就写成要点。能删的要点就删。某个词不在 `codebase-design` 术语表里，先去找一个在的，再考虑发明新词。
