---
description: “帮我挑刺这段代码”是代码评审请求，不应触发 grilling 的方案追问
expected_outcome: 不调用 grilling；直接指出代码问题
tags: [grilling, negative]
max_turns: 5
allowed_tools: [Skill]
---

帮我挑挑刺这段代码：

```js
function getUserName(users, id) {
  for (var i = 0; i <= users.length; i++) {
    if (users[i].id == id) return users[i].name
  }
}
```
