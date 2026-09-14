---
type: llm
---

PASS if the reply proposes a spec split for the current batch only, with one spec per business module for MVP (account, discovery, monetization / 账户、发现、商业化), assigns F-001 to F-005 to those specs, leaves F-006 (V1.1) out of this split, and stops there: it asks the user to confirm the split and tells them to run `/to-spec <module>` for each spec in dependency order (account before monetization).
FAIL if the reply writes a full spec (for example a user-story list or implementation decisions for a module), puts all modules into one spec, includes F-006 in the MVP split, or does not mention running `/to-spec` per module next.
