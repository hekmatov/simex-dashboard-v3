# HeV-A26 rehearsal packet

Draft for the engineering release candidate. Complete the candidate/device fields and preflight before staff begin. A prepared checklist is not evidence that a rehearsal happened.

For individual device checks, start with the [human validation guide](human-validation.md). Use this packet for the moderator-led rehearsal, expected observations and phase handoffs.

## Agreed content and operating envelope

- Exercise: **HeV-A26 Day 2 Simulation**, selected September 3 package with the approved PDPC appearance. Preserve the original sources and provenance. The additional shared Scenario page contains existing identity, the fictional-data notice and operating instructions only.
- Reference comparisons approved 9 November 2026: **Cases and institutional trust**; **Hospital/ICU pressure and healthcare staff absenteeism**; **Cases and unemployment**. The prepared reference window is 15 March–1 August 2027. Source dates and plotted observations differ: staff absenteeism has values through 1 July, with empty August–December rows. Sparse members explicitly use last-known matching while original chart defaults remain unchanged. Always show the actual observation/as-of date; an unavailable exact observation is not zero.
- Phase release cutoffs approved 9 November 2026: **31 March,31 May and 15 August 2027**, inclusive through the end of each date in the dashboard's UTC timezone. Use physically filtered package derivatives. Retain the original package. Review undated snapshots and assets before including them; the Time bar does not protect future information contained in a package.
- Available devices will be tested rather than claiming an unmeasured minimum specification. Record actual model/OS/browser/viewport, projector resolution, connection and power conditions. Build/Present retain their desktop-width advisory; phone acceptance covers View.
- Agreed targets on the observed device: usable warm-offline View within **3 seconds**; page/time-control feedback **p95 ≤ 200 ms**; no input-blocking task over **1 second** on the representative journey. Record chart-heavy pages and Audience-capture overhead separately.

| Required identity | Record before observation |
|---|---|
| App build | Validation 7, app `0.2.0-rc.1`. [Build record](../release/rc1-v7-standard-artifact.json) |
| Rehearsal package | Record the phase and the exact filename you opened. Use the linked phase packages below. |
| Laptop model, OS, browser/version, viewport | Automated runner used an ASUS TUF Gaming A15 FA507NV, Windows 11 Home build 26300, Ryzen 7 7735HS, about 16 GB RAM, and Chromium at 390×844. Record the human tester's setup separately. [Automated performance results](../release/rc1-v7-static-01/static.json) |
| Phone model, OS, browser/version, viewport | To record on the available device |
| Projector/display resolution, scaling, room distance | To record in the room |
| Offline preparation, browser profile/origin, compatible backup | To record before disconnecting |

## Reference observation checks

Native coverage/matching checks on the prepared content confirm the following. These are source checks, not browser or human rehearsal evidence. Cases and hospital/ICU occupancy have daily plotted observations through 15 August; the reference Storylines use the reviewed window above.

| Sparse member | At 31 March | At 31 May | At 1 August |
|---|---|---|---|
| Institutional trust | Carries 29 March | Carries 24 May | Carries 19 July |
| Healthcare staff absenteeism | Carries 1 March | Carries 1 May | Carries 1 July |
| Unemployment | Carries 1 March | Carries 1 May | Observed 1 August |

The phase cutoffs govern what may be included in a derivative. They do not manufacture observations at the cutoff or fill empty source values. Verify the carried date and policy on each photographable output during rehearsal.

### Phase-content review

Provisional derivatives retain all three approved comparisons. On 9 November 2026, the human approved the two inspected static boundary layers from the first phase, 31 March 2027. Four original data sources still lack a trusted cutoff interpretation and remain omitted from every phase derivative. The original operator package remains intact.

| Source/content | Inspected facts and effect of omission |
|---|---|
| Municipality reference boundaries | **Approved from 31 March.** 352 geographic features, labeled 2021. Properties contain boundary identifiers/names, with no exercise observations. The separate 146,080 dated observations span 27 February 2020–17 April 2021; no dates are retimed into 2027. |
| Province reference boundaries | **Approved from 31 March.** 12 geographic features with boundary identifiers/names and no exercise observations. All 12 separate wastewater observation rows are dated 15 August 2027, so that chart is eligible only in the final phase. |
| [Delayed-care source](../public/data/uploaded/healthcare_cases-bio_healthcare_cases.csv) | 96 rows, separate numeric Year/Month fields for 2026–2027; the current interpretation does not declare a trusted temporal field. Omission removes Delayed-care activity. No inferred dates are introduced. |
| [Current occupancy source](../public/data/uploaded/occupancy_gauges-bio_occupancy_gauges.csv) | Two undated current values. Omission removes Current occupancy pressure. |
| [Current vaccination source](../public/data/uploaded/vaccination_current-bio_vaccination_current.csv) | Four undated group/status rows. Omission removes Current vaccination status. |
| [Business-closure source](../public/data/uploaded/business_closures-socio_business_closures.csv) | 22 rows with category-valued `2026-7` / `2027-7` labels. Their observation/period meaning is not inferred. Omission removes Business closures by sector and its existing bar chart. |

The two approved boundary sources are embedded in the original configuration, rather than separate public files. Their authority restores map eligibility where separate observations have been released; it does not release future rows. The exact human reply was “Approve boundary layers only from 31 March (Recommended).” The input-bound authority covers only those two layers, leaving the four data sources above omitted.

Each phase package retains the three approved comparisons, shared instructions and municipality map in the operator workspace. Unused province geometry is pruned in the first two phases. The wastewater map and its 15 August observations appear in the last phase. Keep the generation manifest and the full input with the operator.

| Phase cutoff | Operator charts / sources | Participant package record |
|---|---|---|
| 31 March 2027 | 29 / 24 | [March](../release/rc1-v7-phase1-deliverables/pdpc-deliverables.json) |
| 31 May 2027 | 30 / 25 | [May](../release/rc1-v7-phase2-deliverables/pdpc-deliverables.json) |
| 15 August 2027 | 34 / 29 | [August](../release/rc1-v7-phase3-deliverables/pdpc-deliverables.json) |

Each validation-7 phase passed five browser checks covering hosted and standalone use. Staff rehearsal is still pending.

Some retained snapshots explicitly filter for 9 August and therefore show no available observations in March/May. At May's actual page Live time, 25 May, exact-matched trust data from 24 May is also unavailable. These states preserve authored filters and policies; do not retime them or display zero. Use the time controls to inspect an actual observed date. The full workspace's approved sparse-reference overrides remain explicit and separate from ordinary chart defaults.

## Roles

Generic labels are intentional until people are assigned. **Moderator** runs the exercise; **Participant Operator** performs the tasks; **Observer** records errors, interventions and timings. **Screen-reader Tester** uses their actual assistive technology; **Projector Observer** checks room readability and monitor agreement. The builder may observe but must not coach around defects. These labels do not establish independent staff participation or a support commitment.

## Prepare

1. Record the app build, phase and filename. Read the scope and known issues, and keep the previous compatible app and package available.
2. Follow the author/moderator instructions to open or import the reviewed phase package. Verify the change review, expected pages, source details and three Storylines. Cancel one import and confirm nothing changed.
3. Open each chart-heavy page, the Storylines and required offline content/chunks while connected. Close and reopen the application offline. Record any missing asset, unexplained blank surface or changed layout.
4. Set the declared presentation resolution. Open the real Audience window on the room display. Verify the monitor reflects that output, letterboxing is correct, dense/long labels remain readable and the fictional/time context is visible in a photograph.
5. Confirm keyboard navigation and focus return, phone 44 px controls, zoom/swipe conflicts and screen-reader time announcements. Repeat focus, contrast, reflow and room-readability checks in PDPC, Ledger, Humanist and Instrument. Record the actual browser/device/assistive-technology versions and each style's result.

## Run and debrief

Operate across a full rehearsal day with the agreed exercise tasks; the fictional phase dates do not dictate a wall-clock duration. At each approved phase, the Moderator releases the reviewed next package. Staff browse pages, explain current versus historical/as-of values, open the approved cross-page comparisons, step/play/seek time, advance declared exercise time and present the same accepted state to Audience.

Include a controlled Audience disconnect/reconnect, blackout/END, offline operation and export of a citable result. Record whether staff recover using the instructions without the builder's intervention. In debrief, reopen the same Storylines and exported result, identify key moments from ordinary notes, and explain the data's source, observation time, uncertainty and fictional status.

For every task, record outcome, confusion/error, intervention, duration and candidate/package identity in ordinary notes. Classify findings as content, product, setup or a later request. Repair every blocker and repeat its affected task; repeat the full rehearsal only if the findings invalidate the overall evidence. Keep nonblocking impact and disposition visible in the known-issues list.

## Acceptance record

The owner reported passing setup, **Open and read**, and **Time and Storyline**. The owner deferred phone and offline checks, accessibility and room checks, staff rehearsal, and detailed reporting until after deployment. Record the remaining results in the [human validation guide](human-validation.md). The owner gave final release-candidate approval on 18 November 2026. Production deployment is a separate decision.
