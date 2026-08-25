# Master Correction Resource-Failure Checkpoint

**Date:** 2026-08-25
**Profile:** Chromium 149.0.7827.55, 1024×768, 4× CDP CPU throttle, `--max-old-space-size=512`

The fresh 48,000,000-byte encoded fixture was run after the 16, 24, and 32 MB rungs had completed in bounded fresh-browser runs. It did not complete one three-sample rung within the 90-second observation window. During that window the largest Chromium process reached 923,045,888 bytes working set while the page was under the pinned 512 MiB V8 old-space launch constraint. The exact benchmark process was then stopped; the Vite server and repository remained intact.

This is the observed resource-failure region, not itself the allowed hard boundary. It is not folded into median/p95 timing because the rung did not finish. The prior fully completed encoded rung was 31,999,997 bytes: 441.3 ms package-import p95, 1,567 ms maximum long task, and 39.9 ms interaction p95. The prior fully completed property-value rung was 32,000,164 encoded bytes with exactly 32,000,000 property-value bytes: 426.1 ms package-import p95, 1,483 ms maximum long task, 30.2 ms interaction p95, and a 224,054,934-byte maximum measured heap delta.

Renewed master review required meaningful demonstrated margin below that failure. A single targeted constrained rung at 35,999,997 encoded bytes (35,999,833 total encoded property-value bytes) completed all three samples: 543.4 ms package-import p95, 406.6 ms summary p95, 39.9 ms interaction p95, 216,171,884-byte maximum heap delta, and an exact 2,000 ms maximum long task. Reaching the predeclared hard-knee rule made further 40/44 MB probes unnecessary.

The final correction therefore keeps values below 32 MB normal, warns and permits values from 32,000,000 through 35,999,999 only when all other dimensions are safe, and hard-rejects at 36,000,000 for both encoded source bytes and total encoded property-value bytes. The 36 MB boundary itself is rejected; 32 MB is the highest fully measured allowed rung. This leaves 12 MB, or 25%, between the hard boundary and the observed 48 MB resource failure, while the boundary remains more than 185 times the largest legitimate 193,816-byte source.
