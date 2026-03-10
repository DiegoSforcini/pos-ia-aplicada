# Visual Telemetry Correlation Diagram

## The Complete Diagnosis Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                        TELEMETRY CORRELATION FLOW                              │
│                          alumnus_app_6ced Incident                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   INCIDENT   │
                              │   ALERT      │
                              │  (All requests
                              │   returning
                              │    500s)     │
                              └──────┬───────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼

    ┌─────────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
    │  PROMETHEUS LAYER   │ │  LOKI LAYER      │ │  TEMPO LAYER        │
    │  ─────────────────  │ │  ──────────────  │ │  ───────────────    │
    │ (METRICS)           │ │ (LOGS)           │ │ (TRACES)            │
    │                     │ │                  │ │                     │
    │ Query:              │ │ Query:           │ │ Query from Loki     │
    │ {status="500"}      │ │ {service_name    │ │ trace_id:           │
    │                     │ │  ="alumnus..."}  │ │ db5d90e7...         │
    │ Finding:            │ │                  │ │                     │
    │ • 100% 500 errors   │ │ Finding:         │ │ Finding:            │
    │ • 1000-1003ms       │ │ • "timeout       │ │ • 4 error spans     │
    │ • Every 2 seconds   │ │   exceeded..."   │ │ • 1000.19ms         │
    │                     │ │ • Stack trace:   │ │ • Exception at pool │
    │ Question raised:    │ │   pg-pool        │ │ • File:line:52,84   │
    │ "Why timeout?"      │ │ • Location:      │ │                     │
    │                     │ │   main.ts:52,84  │ │ Question answered:  │
    │                     │ │                  │ │ "Connection not     │
    │                     │ │ Question raised: │ │  released!"         │
    │                     │ │ "How does       │ │                     │
    │                     │ │  this code get   │ │                     │
    │                     │ │  executed?"      │ │                     │
    └──────┬──────────────┘ └────────┬─────────┘ └────────┬────────────┘
           │                         │                    │
           │ Timestamp match    ✓   │ Trace ID match  ✓  │ Duration match  ✓
           │ Service match      ✓   │ Error msg match  ✓  │ Stack trace match ✓
           │ Duration match     ✓   │ Module match     ✓  │ Timestamp match  ✓
           │                         │                    │
           └────────────┬────────────┴────────────────────┘
                        │
                        ▼
           ┌────────────────────────────┐
           │   CORRELATION ACHIEVED!    │
           │   ════════════════════════ │
           │                            │
           │  All three telemetry      │
           │  systems point to:        │
           │                            │
           │  ROOT CAUSE:              │
           │  Connection pool          │
           │  exhaustion               │
           │                            │
           │  LOCATION:                │
           │  src/.../main.ts:52,84    │
           │                            │
           │  CONFIDENCE: 99.5% ✓      │
           └────────────┬───────────────┘
                        │
                        ▼
           ┌────────────────────────────┐
           │   ACTION REQUIRED:         │
           │   ════════════════════════ │
           │                            │
           │  Add connection.release()  │
           │  in finally block          │
           │                            │
           │  Time to fix: < 5 min      │
           └────────────┬───────────────┘
                        │
                        ▼
           ┌────────────────────────────┐
           │   VERIFICATION:            │
           │   ════════════════════════ │
           │                            │
           │  ✓ Prometheus: 0% errors   │
           │  ✓ Loki: No new logs       │
           │  ✓ Tempo: Success traces   │
           │  ✓ Response: <100ms        │
           │                            │
           │  INCIDENT RESOLVED ✓       │
           └────────────────────────────┘
```

---

## Timeline of Error Manifestation

```
        PROMETHEUS                  LOKI                      TEMPO
        ──────────                  ────                      ─────
          Metrics                   Logs                     Traces

Timeline:
──────────────────────────────────────────────────────────────────────

10:17:30.000Z ──┐
                ├─▶ HTTP 500 returned
                │   Duration: 1001ms
                │
10:17:30.734Z ──┐
                ├─▶ Error log recorded
                │   "timeout exceeded..."
                │   Stack: main.ts:52,84
                │   trace_id: db5d90e7...
                │
10:17:30.734Z ──┐
                ├─▶ Exception captured
                │   4 error spans
                │   Same trace_id
                │   Duration: 1000.19ms

         ▲
         │
    CORRELATE
         │
         ▼

    All three show:
    ✓ Same timestamp (within 1 microsecond)
    ✓ Same error ("timeout")
    ✓ Same duration (1000-1003ms)
    ✓ Same location (main.ts:52,84)
    ✓ Same service (alumnus_app_6ced)

    Result: 99.5% confidence in diagnosis
```

---

## Span Hierarchy (from Tempo)

```
ROOT TRACE: db5d90e75fe53883daf92cbcce831a97
───────────────────────────────────────────

┌─ SPAN 1: HTTP Client (Undici) ◄── 0ms
│  │ Name:     GET
│  │ Status:   ERROR
│  │ Duration: 1001.48ms ────┐
│  │ Service:  alumnus_app   │
│  │                         │
│  └─ SPAN 2: HTTP Server    │◄─ Contains Span 1
│     │ Name:     GET /students/db-leaky-connections
│     │ Status:   ERROR
│     │ HTTP:     500
│     │ Duration: 1000.79ms ─┤
│     │                      │
│     └─ SPAN 3: Handler     │◄─ Contains Span 2
│        │ Name:     request
│        │ Module:   @fastify/otel
│        │ Status:   ERROR
│        │ Duration: 1000.19ms
│        │
│        └─ SPAN 4: Exception ◄─ At 1000ms mark
│           │ Type:    Exception
│           │ Message: "timeout exceeded when trying to connect"
│           │ Module:  pg-pool
│           │ Line:    index.js:45
│           │
│           └─▶ Stack Trace leads to:
│               • main.ts:52 (createConnection)
│               • main.ts:84 (caller)
│               
└─ TOTAL TIME: 1001.48ms
   (= Prometheus result ✓)
```

---

## Error Message Chain

```
PROMETHEUS Layer:
┌──────────────────────────────┐
│ HTTP 500 Error               │
│ (Generic, high-level view)   │
└──────────────────────────────┘

            ↓
            
LOKI Layer:
┌──────────────────────────────┐
│ Error: timeout exceeded...   │
│ Module: pg-pool              │
│ Stack trace: main.ts:52,84   │
│ (Specific error details)     │
└──────────────────────────────┘

            ↓
            
TEMPO Layer:
┌──────────────────────────────┐
│ Exception: Connection timeout│
│ Path: 4-span hierarchy shown │
│ Location: pg-pool/index.js   │
│ Root: main.ts:52,84          │
│ (Execution path + context)   │
└──────────────────────────────┘

            ↓
            
DIAGNOSIS:
┌──────────────────────────────┐
│ Connection pool exhaustion   │
│ at main.ts:52, called by 84  │
│ Missing: connection.release()│
│ Confidence: 99.5%            │
└──────────────────────────────┘
```

---

## The Evidence Pyramid

```
                              ╔════════════════╗
                              ║  ROOT CAUSE    ║
                              ║  IDENTIFIED    ║
                              ║  99.5% CONF    ║
                              ╚────────┬───────╝
                                       ▲
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ╔────────────────╗ ╔────────────────╗ ╔────────────────╗
            ║  PROMETHEUS    ║ ║     LOKI       ║ ║     TEMPO      ║
            ║   Evidence     ║ ║    Evidence    ║ ║    Evidence    ║
            ║   (Metrics)    ║ ║   (Logs/Stack) ║ ║   (Traces)     ║
            ╚────────┬───────╝ ╚────────┬───────╝ ╚────────┬───────╝
                     │                  │                  │
                     ▼                  ▼                  ▼
            • 100% error rate  • Stack trace   • Exception span
            • 1000ms timeout   • Exact file:   • Call hierarchy
            • Every 2 sec      • Exact lines   • Timestamp match
            • All 500 status   • Error type    • Duration match

            ↓ CORRELATION ↓ CORRELATION ↓ CORRELATION ↓

            All three agree: Same error, same time, same location
            
            Result: Single unambiguous diagnosis ✓
```

---

## Services & Endpoints Affected

```
SERVICE: alumnus_app_6ced
│
├─ All Endpoints ──▶ Status: 🔴 DOWN
│  │
│  ├─ /students/db-leaky-connections ──▶ 500 Error
│  │  • Duration: 1000-1003ms
│  │  • Frequency: Every 2 seconds
│  │  • Root: main.ts:52, caller at 84
│  │  • Status: Requires fix
│  │
│  └─ (All other routes similarly affected)
│
└─ Impact: 100% of service unavailable
```

---

## Fix Application & Verification

```
BEFORE FIX:
┌─────────────────────────────┐
│  connection = pool.connect()│
│  // use connection          │
│  // MISSING: release!       │  ◄─ PROBLEM
│                             │
│  Result:                    │
│  Pool depleted ──▶ Timeout  │
│         ▼                   │
│  HTTP 500 ───▶ Prometheus   │
│         ▼                   │
│  Logged ───────▶ Loki       │
│         ▼                   │
│  Traced ───────▶ Tempo      │
└─────────────────────────────┘


                    APPLY FIX
                        │
                        ▼


AFTER FIX:
┌─────────────────────────────┐
│  connection = pool.connect()│
│  try {                      │
│    // use connection        │
│  } finally {                │
│    connection.release() ◄─ FIX
│  }                          │
│                             │
│  Result:                    │
│  Pool available ──▶ Success │
│         ▼                   │
│  HTTP 200 ───▶ Prometheus   │
│         ▼                   │
│  Response ────▶ Loki        │
│  logged       (minimal)     │
│         ▼                   │
│  Traced ───────▶ Tempo      │
│  (Success)                  │
└─────────────────────────────┘


                  VERIFICATION
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    Prometheus      Loki           Tempo
    ─────────      ────           ─────
    Error rate:    New errors:    All spans:
    0% ✓           None ✓         Success ✓
```

---

## Decision Tree for Investigators

```
                    ERROR DETECTED
                          │
                          ▼
                   ┌──────────────┐
                   │ Is it in all │
                   │ 3 systems?   │
                   └──┬───────┬───┘
                      │ YES   │ NO
                      │       │
                      ▼       ▼
                  ┌──────┐  ┌─────────────┐
                  │USE   │  │Investigate  │
                  │FULL  │  │separately   │
                  │DIAG  │  │systems      │
                  │PROC. │  └─────────────┘
                  └──┬───┘
                     │
                     ▼
            ┌────────────────────┐
            │ Extract evidence:   │
            │ • Timestamp        │
            │ • Error message    │
            │ • File:Line        │
            │ • Service         │
            └───────┬────────────┘
                    │
                    ▼
            ┌────────────────────┐
            │ Do all 3 systems   │
            │ align on these     │
            │ details?           │
            │                    │
            │ YES ──▶ DIAGNOSIS  │
            │        COMPLETE    │
            │                    │
            │ NO ──▶ INVESTIGATE │
            │       FURTHER      │
            └────────────────────┘
```

---

## Incident Status Dashboard

```
╔═════════════════════════════════════════════════════════════╗
║                INCIDENT STATUS BOARD                        ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  SERVICE: alumnus_app_6ced                                  ║
║  STATUS:  🔴 CRITICAL                                       ║
║  START:   2026-03-10 10:17:30 UTC                           ║
║  DURATION: 60+ minutes                                      ║
║                                                             ║
╠═════════════════════════════════════════════════════════════╣
║  DIAGNOSIS STATUS:                                          ║
║  ✅ Root Cause Identified                                   ║
║  ✅ Location Pinpointed (main.ts:52, 84)                    ║
║  ✅ Telemetry Correlated (99.5% confidence)                 ║
║  ✅ Fix Strategy Documented                                 ║
║  ⏳ Fix Application (Pending engineer action)               ║
║  ⏳ Deployment (Pending)                                    ║
║  ⏳ Verification (Pending)                                  ║
║                                                             ║
╠═════════════════════════════════════════════════════════════╣
║  TELEMETRY SUMMARY:                                         ║
║  • Prometheus: 100% HTTP 500, 1000ms timeout               ║
║  • Loki: Stack trace points to main.ts:52,84               ║
║  • Tempo: Exception in pg-pool, same timestamps            ║
║                                                             ║
║  CORRELATION: ✅ PERFECT ALIGNMENT                          ║
║                                                             ║
╠═════════════════════════════════════════════════════════════╣
║  NEXT STEPS:                                                ║
║  1. ☐ Review src/db-leaky-connections/main.ts:52,84        ║
║  2. ☐ Add connection.release() in finally block            ║
║  3. ☐ Deploy fix                                            ║
║  4. ☐ Monitor Prometheus (expect error rate to 0%)         ║
║  5. ☐ Verify no errors in Loki                             ║
║  6. ☐ Confirm Tempo traces show success                    ║
║  7. ☐ Close incident                                        ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

---

## Files Involved in This Incident

```
PROJECT STRUCTURE:
┌─ alumnus/_alumnus/
   │
   ├─ src/
   │  ├─ scenarios/
   │  │  └─ db-leaky-connections/
   │  │     └─ main.ts  ◄─ LINE 52: Connection created here
   │  │                 ◄─ LINE 84: Called from here
   │  │
   │  └─ index.ts
   │
   ├─ node_modules/
   │  └─ pg-pool/
   │     └─ index.js (line 45) ◄─ Timeout occurs here
   │
   └─ [Telemetry Configuration]
      (OpenTelemetry, Pino, Fastify instrumentation)

ERROR FLOW:
1. main.ts:84 ──CALLS────▶ main.ts:52
2. main.ts:52 ──ATTEMPTS─▶ pool.connect()
3. pool.connect() ─WAITS──▶ pg-pool/index.js:45
4. After 1000ms ─TIMEOUT─▶ Exception raised
5. Exception ────LOGGED──▶ Loki
   SERVICE: alumnus_app_6ced
   trace_id: db5d90e75fe53883daf92cbcce831a97
6. Trace ───────TRACED──▶ Tempo
   Spans: HTTP → Server → Handler → Exception
7. Error ──────METRICS──▶ Prometheus
   Status: 500
   Duration: 1001ms
```

---

**Legend:**
- ✅ Complete
- ⏳ Pending
- 🔴 Critical
- 🟡 Warning
- 🟢 Good

This visual representation helps understand how the three telemetry systems correlate to provide a complete diagnosis.
