---
description: 偶发 bug 应先建立复现手段，而不是凭读代码直接宣布修好
expected_outcome: 调用 diagnosing-bugs；先提出能在该 bug 上失败的复现命令或测试，不直接宣布修复
tags: [diagnosing-bugs, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

报表中心点“导出”偶尔会报错，大概十次出现一次：

```
TypeError: Cannot read properties of undefined (reading 'rows')
    at buildSheet (export/buildSheet.ts:18:24)
```

`export/buildSheet.ts` 相关代码：

```ts
export async function buildSheet(reportId: string) {
  const data = await cache.get(reportId) ?? await fetchReport(reportId);
  return data.rows.map(toRow);
}
```

组长说一看就是没判空，赶紧修了发版。帮我修一下。
