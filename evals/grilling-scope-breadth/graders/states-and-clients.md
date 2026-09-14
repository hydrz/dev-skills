---
type: llm
---

PASS if the reply asks numbered clarification questions (rather than delivering a finished design) AND those questions explicitly cover at least two non-default states of the unlock flow (for example: insufficient coin balance, payment or deduction failure, not signed in / guest, loading, network error, already unlocked, duplicate tap) AND at least one question about how behavior or presentation differs across clients (iOS, Android, H5) or across user roles (guest, signed-in, member).
FAIL if the reply only asks about the happy path, or gives a complete design without asking questions, or never mentions differences across clients or roles.
