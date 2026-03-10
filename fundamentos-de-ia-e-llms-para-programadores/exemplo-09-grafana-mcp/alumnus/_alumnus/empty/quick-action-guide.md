# Quick Action Guide: Using Telemetry Correlation for Incident Response

## 🚨 Incident Alert Received

**Status:** Service alumnus_app_6ced returning HTTP 500  
**Time:** 2026-03-10, ongoing for 60+ minutes  
**Impact:** All requests failing  

**What to do in the next 5 minutes:**

---

## Step 1: Confirm With Prometheus (30 seconds)

### Query
```promql
rate(http_request_duration_seconds_count{service="alumnus_app_6ced", http_status_code="500"}[5m])
```

### What to Look For
- [ ] Is error rate 100%?
- [ ] Is duration 1000-1003ms?
- [ ] Is pattern consistent?

### If YES → Proceed to Step 2  
**If NO** → Problem might be different, investigate further

---

## Step 2: Investigate Root Cause in Loki (1 minute)

### Query
```logql
{service_name="alumnus_app_6ced"} | json | severity_text="error"
```

### What to Look For
- [ ] Error message: "timeout exceeded when trying to connect"?
- [ ] Stack trace points to a specific file?
- [ ] Module mentioned: pg-pool or similar?

### Key Information to Extract
```
Error Message: ___________________________
Module/Library: ___________________________
File:Line #:    ___________________________
Function:       ___________________________
```

### Example Stack Trace Analysis
```
IF you see:
  "at /node_modules/pg-pool/index.js:45"
THEN: Database connection pool issue

IF the stack then shows:
  "at service/main.ts:52"
  "at service/main.ts:84"
THEN: Those lines are the problem

IF the file is named something like:
  "db-leaky-connections"
THEN: Connections are probably not being released
```

### If Found → Proceed to Step 3  
**If NOT found** → Check Loki logs more broadly, pattern might be different

---

## Step 3: Confirm Execution Path in Tempo (2 minutes)

### Query
Get a trace_id from the Loki log entry (in the `trace_id` field)

```traceql
{trace_id="<paste-trace-id-from-loki>"}
```

### What to Look For
- [ ] Do spans show ERROR status?
- [ ] Is duration aligned with Prometheus (1000ms)?
- [ ] Do error messages match between Loki and Tempo?

### Span Analysis Checklist
```
Root Span Details:
  Name: ________________
  Duration: ____________ ms
  Status: ______________ (should be ERROR)

Exception Details:
  Type: __________________
  Message: __________________
  Module: __________________
  Line: __________________

Does it match Loki stack trace? YES / NO
```

### If Matches → Proceed to Step 4  
**If NOT matching** → Triple-check timestamps are within 1 second

---

## Step 4: Identify Exact Problem (1 minute)

### Questions to Answer

**Q1: What is the error?**
```
Answer: _____________________________

Check: Is it the same in all three (Prometheus, Loki, Tempo)?
```

**Q2: Where is the error originating?**
```
File: ________________
Line: ________________
Function: ________________

Check: Do all three sources point to same location?
```

**Q3: Why is this happening?**
```
Root Cause: ________________

Based on: [ ] File name [ ] Stack trace [ ] Missing code
```

**Q4: Is this systematic?**
```
Frequency: ________________
Pattern: ________________
All requests affected?: YES / NO

Check: Does Prometheus show consistent error rate?
```

### Example Analysis
```
Q1 What: Database connection timeout
Q2 Where: src/db/connection.ts:42
Q3 Why: Connections not returned to pool
Q4 Systematic: Yes, every 2 seconds, 100% requests

ROOT CAUSE CONFIRMED ✓
```

---

## Step 5: Create Fix (2 minutes)

### Code Review Checklist

Navigate to the file identified (e.g., `src/db/connection.ts`)

Look for this pattern:
```typescript
// ❌ PROBLEM PATTERN - Connection not released
async function handler() {
  const client = await pool.connect()  // <- Connection acquired
  // ... do work ...
  // MISSING: await client.release()
}
```

Change to:
```typescript
// ✅ FIXED PATTERN - Connection properly released
async function handler() {
  const client = await pool.connect()
  try {
    // ... do work ...
  } finally {
    await client.release()  // <- ADD THIS
  }
}
```

### Checklist
- [ ] Found the connection.acquire() call
- [ ] Confirmed no matching .release() call
- [ ] Added .release() in a finally block
- [ ] Saved the file

---

## Step 6: Verify Fix (30 seconds)

### Immediate Verification (After Deploy)

#### In Prometheus
```promql
rate(http_request_duration_seconds_count{service="alumnus_app_6ced", http_status_code="500"}[1m])
```
Expected: Should drop from 100% to near 0%

Monitor until you see:
- [ ] Error rate drops to 0%
- [ ] Response times drop to <100ms
- [ ] No more 500 errors appearing

#### In Loki
```logql
{service_name="alumnus_app_6ced"} | severity_text="error" | recent
```
Expected: No new error logs should appear

Check:
- [ ] Last error timestamp is before deployment
- [ ] No errors in last 5 minutes

#### In Tempo
Open recent trace for same service

Expected: All spans show SUCCESS, not ERROR

Check:
- [ ] HTTP status changed from 500 to 200
- [ ] No exception spans
- [ ] Duration under 100ms

### Success Criteria
When you see ✅ for all:
```
✅ Prometheus: Error rate 0%
✅ Loki: No new error logs
✅ Tempo: All traces showing success
✅ Response time: <100ms

INCIDENT RESOLVED ✓
```

---

## Troubleshooting This Process

### "I don't see the Prometheus errors"
1. Check time range (last 1 hour at minimum)
2. Verify service name exactly matches
3. Try broader query: `http_requests_total{service="alumnus_app_6ced"}`

### "Loki logs don't have stack traces"
1. Check if log level includes ERROR
2. Try: `{service_name="alumnus_app_6ced"} | json`
3. Look for `err_stack` or `stack_trace` fields

### "Trace ID from logs doesn't match Tempo"
1. Verify trace_id format is correct (usually 16-32 hex characters)
2. Ensure you're querying correct datasource
3. Check timestamps are within same 1-minute window

### "I found multiple errors, which is the real one?"
1. Pick the **most recent** error
2. Or pick one that appears in **all three systems**
3. If same root cause, all should show similar patterns

---

## Template: Incident Report Using This Method

```
INCIDENT REPORT
═══════════════════════════════════════════════════════════

SERVICE AFFECTED
  Service: alumnus_app_6ced
  Status: DOWN (100% failure rate)
  Duration: 60+ minutes
  Impact: All requests returning HTTP 500

ROOT CAUSE ANALYSIS
  Primary Cause: Database connection pool exhaustion
  Location: src/scenarios/db-leaky-connections/main.ts
  Lines: 52 (leak), 84 (caller)
  Issue: Connections created but not released
  
  Evidence:
    ✓ Prometheus: 100% HTTP 500 errors, 1000-1003ms
    ✓ Loki: "timeout exceeded..." error logs
    ✓ Tempo: Exception in connection pool code
    ✓ All three confirm same issue

RESOLUTION APPLIED
  Action: Added connection.release() in finally block
  File: src/scenarios/db-leaky-connections/main.ts
  Lines Changed: Added cleanup code
  Time to Fix: < 5 minutes
  
  Verification:
    ✓ Prometheus: Error rate dropped to 0%
    ✓ Loki: No new error logs
    ✓ Tempo: Traces now show success

TELEMETRY CORRELATION
  Method: Cross-layer analysis
    1. Prometheus detected symptom (HTTP 500)
    2. Loki revealed root cause (pool timeout)
    3. Tempo confirmed execution path
    4. All three aligned on same timestamp
  
  Confidence: 99.5%
  Resolution: CONFIRMED ✓

═══════════════════════════════════════════════════════════
```

---

## Key Insights for Future Incidents

### Pattern Recognition Flowchart

```
INCIDENT ALERT
    ↓
    ├─ "Is it systematic?" (Prometheus)
    │  ├─ YES: Proceed to find root cause
    │  └─ NO: Might be transient, check again
    ↓
    ├─ "What is the error?" (Loki)
    │  ├─ Timeout: Database/network issue
    │  ├─ OOM: Memory leak
    │  ├─ Permission: Security/config issue
    │  └─ Other: Check logs for specifics
    ↓
    ├─ "Where exactly?" (Tempo)
    │  ├─ Database layer: DB/pool issue
    │  ├─ Handler layer: Application logic
    │  ├─ HTTP layer: Network/proxy issue
    │  └─ OS layer: System resource
    ↓
    └─ ROOT CAUSE IDENTIFIED
       Fix → Deploy → Verify ✓
```

### Common Patterns to Watch For

| Pattern | Prometheus Sign | Loki Sign | Tempo Sign | Action |
|---------|-----------------|-----------|-----------|--------|
| **Pool Exhaustion** | 1000ms timeout | "timeout" + pool | Exception at pool | Add release() |
| **Memory Leak** | P99 latency → ∞ | OOM errors | Span duration → ∞ | Find leak source |
| **Cascading Failure** | All 500s | "upstream timeout" | Chains of timeouts | Fix root service |
| **Resource Limit** | Periodic failures | "limit exceeded" | Timeout on limit | Increase resource |
| **Configuration Error** | Immediate 500s | "invalid config" | Early exception | Fix config |

---

## When to Use Each Telemetry Source

| Question | Primary Source | Backup Sources |
|----------|---|---|
| **Is there an issue?** | Prometheus | Loki alerts |
| **How big is the impact?** | Prometheus | Loki volume |
| **What is the exact error?** | Loki | Tempo exceptions |
| **Where does it occur?** | Loki stack trace | Tempo span path |
| **Why is it happening?** | Loki + Tempo analysis | - |
| **How to fix it?** | Loki stack trace | Source code review |
| **Is it fixed?** | Prometheus + Loki | Tempo verification |

---

## Pro Tips for Operators

### Tip #1: Always Correlate Before Assuming
```
❌ WRONG: "Prometheus shows 500s, let me restart the service"
✅ RIGHT: "Let me check Loki for the actual error first"
```

### Tip #2: Use Trace IDs as Your Bridge
```
Loki Log → Extract trace_id → Query Tempo → Get execution path
```

### Tip #3: Timestamps Must Align
```
All three systems should show errors within same second.
If they don't, you might be looking at different incidents.
```

### Tip #4: Stack Traces Point Directly to the Problem
```
❌ DON'T ignore the file:line numbers in stack traces
✅ DO go directly to those lines and examine the code
```

### Tip #5: "Leaky" or "Exhausted" in Error Names = Pool/Resource Issue
```
"db-leaky-connections" → connections not released
"cache-exhausted" → cache size exceeded
"memory-leak" → memory not freed
```

---

## Final Checklist: Before You Close the Incident

- [ ] Root cause identified in code
- [ ] All three telemetry sources confirm same issue
- [ ] Fix verified in code review
- [ ] Fix deployed to production
- [ ] Prometheus shows error rate at 0% (minimum 10 minutes)
- [ ] Loki shows no new errors for last 10 minutes
- [ ] Tempo shows all traces with success status
- [ ] Response time returned to normal baseline
- [ ] No customer complaints in last 15 minutes
- [ ] Post-incident notes documented

---

**Remember:** When Prometheus, Loki, and Tempo all agree, you have your answer. 🎯

Use these three pillars to turn vague "something is broken" into precise "here's the exact line of code causing the problem."
