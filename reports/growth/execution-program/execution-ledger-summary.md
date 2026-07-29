# Growth Execution Ledger Summary

Validation: **PASS**

## Coverage

- Master backlog rows: 601
- Ledger rows: 601
- Executable rows: 377
- Executable rows with implementation proof: 2
- Released or measured executable rows: 2
- Executable rows without completion proof: 375

## Execution status

- BLOCKED: 207
- IMPLEMENTED: 0
- IN_PROGRESS: 0
- MEASURED: 0
- NOT_STARTED: 168
- REJECTED: 224
- RELEASED: 2

## Blocking breakdown

- DEPENDENCY: 96
- MANUAL_EXTERNAL: 111

Rows awaiting direct execution:

- EXECUTE_NOW: 97
- QUEUE: 71

A row is never counted as implemented, released, measured, or rejected
without a full commit SHA reachable from `origin/main`. Released rows also
require an HTTPS URL and timezone-aware release and measurement timestamps.
