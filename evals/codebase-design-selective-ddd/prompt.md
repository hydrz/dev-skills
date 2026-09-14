---
description: 简单业务模块加功能时，应按复杂度选择轻量结构，不默认套用 DDD 战术模式和分层
expected_outcome: 调用 codebase-design；建议在用户资料模块中直接新增一个修改昵称的用例文件，不引入聚合、仓储、领域服务或工厂
tags: [codebase-design, trigger, behavior]
max_turns: 8
allowed_tools: [Skill]
---

我们是 Go 项目，模块化单体。`user/` 模块现在只有两个文件：`get_profile.go` 和 `update_avatar.go`，都是 handler 里直接查写 `users` 表，没有别的业务规则。

现在要加一个“修改昵称”的接口，只校验长度 2 到 20 个字符。同事说既然要按 DDD 来，这次顺便把 `UserAggregate`、`UserRepository` 接口和实现、`UserDomainService`、`UserFactory` 都建起来，目录拆成 `domain/`、`application/`、`infrastructure/`。

你觉得应该怎么做？给我目录结构和理由就行，先不用写代码。
