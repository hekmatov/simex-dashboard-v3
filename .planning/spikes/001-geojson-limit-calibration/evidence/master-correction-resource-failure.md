# Master Correction Resource-Failure Checkpoint

**Date:** 2026-08-25
**Profile:** Chromium 149.0.7827.55, 1024×768, 4× CDP CPU throttle, `--max-old-space-size=512`

The fresh 48,000,000-byte encoded fixture was run after the 16, 24, and 32 MB rungs had completed in bounded fresh-browser runs. It did not complete one three-sample rung within the 90-second observation window. During that window the largest Chromium process reached 923,045,888 bytes working set while the page was under the pinned 512 MiB V8 old-space launch constraint. The exact benchmark process was then stopped; the Vite server and repository remained intact.

This is the resource-failure boundary for the byte/property-volume safety ceiling. It is not folded into median/p95 timing because the rung did not finish. The last fully completed encoded rung was 31,999,997 bytes: 441.3 ms package-import p95, 1,567 ms maximum long task, and 39.9 ms interaction p95. The last fully completed property-value rung was 32,000,164 encoded bytes with exactly 32,000,000 property-value bytes: 426.1 ms package-import p95, 1,483 ms maximum long task, 30.2 ms interaction p95, and a 224,054,934-byte maximum measured heap delta.

The correction therefore sets warning at 32 MB and hard rejection at 48 MB for both encoded source bytes and total encoded property-value bytes. An 8 MB source is normal, 32–<48 MB is warned but may proceed when all other dimensions are safe, and 48 MB or greater is rejected before parse/commit. The hard ceiling is 248× the largest legitimate source and has a successful 32 MB measured margin below the failing rung.
