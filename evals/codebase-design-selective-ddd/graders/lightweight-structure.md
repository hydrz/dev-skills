---
type: llm
---

PASS if the reply recommends keeping the `user/` module lightweight, for example adding a single use-case file such as `update_nickname.go` next to the existing files, and explains that aggregates, repositories, domain services, factories, or `domain/`/`application/`/`infrastructure/` layers are not warranted for this simple CRUD without state transitions or business invariants.
FAIL if the reply recommends creating `UserAggregate`, `UserRepository`, `UserDomainService`, `UserFactory`, or splitting the module into technical layers, or if it gives no concrete directory structure.
