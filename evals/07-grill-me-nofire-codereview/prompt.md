---
max_turns: 5
timeout_seconds: 120
allowed_tools: [Skill]
runs: 3
tags: [grilling]
---
帮我看看这段代码写得怎么样：

```python
def calc_total(items):
    total = 0
    for i in items:
        total = total + i.price * i.qty
    return total
```
