# SimEx Showcase Home Design

Date: 2026-07-24  
Status: Approved for implementation planning  
Branch: `codex/showcase-home`  
Repository: `<repo-root>`

## Purpose

Replace the current Home tab with an orienting landing page for the Cloudflare-hosted demonstration. The page must help a first-time management visitor understand the dashboard's operational value, see credible evidence of its capabilities, enter the live HeV-A26 demonstration, and understand the first-deliverable and Quorum-integration status without overstatement.

The product story is:

> SimEx is a reusable dashboard platform, demonstrated through the HeV-A26 scenario, that brings biomedical and socio-economic signals into a shared decision-support environment.

The page balances four messages in this order:

1. Operational value
2. Product capability
3. Live demonstration
4. Delivery confidence and Quorum readiness

## Repository and Integration Strategy

Use an integration-first strategy.

The Quorum Phase 5 branch, `codex/dashboard-companion-readiness`, contains the complete `content/cloudflare-beta` history and adds eight commits on top of it. The feature branch `codex/showcase-home` therefore starts from the Quorum-ready branch rather than creating a second landing-page implementation on the older Cloudflare line.

The completed feature must be tested in two operating contexts:

- Standalone Cloudflare hosting with no Quorum companion available
- A Quorum-connected local environment

After both contexts pass verification, `content/cloudflare-beta` can advance to the tested feature commit. This keeps the hosted showcase and Quorum-compatible dashboard on one product line.

## Goals

- Orient a management visitor within the first viewport.
- Present SimEx as a reusable platform while using HeV-A26 as tangible evidence.
- Provide clear routes into the Biomedical and Socio-economic tabs.
- Offer a compact guide to capabilities visitors can try.
- Explain configurability without making edit mode the primary visitor journey.
- Describe Quorum as an integration-ready direction, not as active Cloudflare functionality.
- Preserve all Phase 5 companion, fullscreen, editing, data, and analytical-page behavior.
- Work well on desktop, tablet, and phone.

## Non-goals

- Redesigning the Biomedical or Socio-economic tabs
- Changing the Quorum companion protocol
- Adding a guided-tour framework, modal walkthrough, or onboarding state machine
- Making landing-page content editable through dashboard edit mode
- Embedding live charts inside the hero
- Adding analytics, authentication, or new external services
- Presenting the Cloudflare page as an active Quorum deployment

## Orienting Design Principles

1. **Explain before asking.** State what the product is, why it matters, what scenario is shown, and what the visitor can do next.
2. **Outcomes before features.** Lead with operational outcomes such as situational awareness and briefing confidence; use filters, fullscreen comparison, and configuration as supporting evidence.
3. **Progressive disclosure.** Move from executive summary to capabilities and only then to domain detail.
4. **Evidence over marketing.** Every capability claim must correspond to something visible or usable in the demonstration.
5. **Honest status.** Distinguish delivered, demonstrated, and integration-ready states.
6. **Preserve familiarity.** Reuse the dashboard navigation, typography, panel geometry, and core palette.
7. **One dominant action per section.** Avoid recreating analytical-tab density on the landing page.

## Information Architecture

The approved structure is an executive narrative:

### 1. Global navigation

Keep the existing Home, Biomedical, and Socio-economic tab navigation so visitors immediately understand that the landing page is part of the dashboard.

### 2. Purpose-led hero

Required content:

- Delivery label: `First deliverable · Live HeV-A26 demonstration`
- Headline: `From complex exercise data to shared situational awareness`
- Summary: a reusable dashboard platform that brings biomedical and socio-economic signals into one decision-support environment
- Primary action: `Explore the live dashboard`, opening the Biomedical tab
- Secondary action: `See what to try`, scrolling to the guided capability list
- A presentation-controlled preview captured from the real dashboard

### 3. Executive proof points

Show three concise statements:

- Cross-domain overview
- Briefing-ready views
- Configurable foundation

Each proof point includes one supporting sentence. This strip must remain scannable and must not turn into a feature inventory.

### 4. Operational capability outcomes

Show three outcome cards:

- See the evolving situation
- Understand wider impacts
- Turn insight into a briefing

Supporting copy references the real Biomedical and Socio-economic indicators and the dashboard's focused, fullscreen, comparative, and responsive presentation capabilities.

### 5. Live demonstration routes

Provide two prominent entry cards:

- Biomedical: epidemiological spread, transmission, healthcare demand, surveillance, and vaccination
- Socio-economic: behaviour, trust, wellbeing, business disruption, and workforce impacts

Each card navigates to the corresponding dashboard tab.

### 6. What to try

Provide a compact, non-modal guide highlighting:

- Filters
- Fullscreen and multi-chart comparison
- Responsive device layouts
- Configurable views

Configurability is demonstrated but controlled: the page explains the capability without making edit mode the main call to action.

### 7. Delivery status

End with three precise states:

- Dashboard delivered
- Cloud-hosted showcase
- Quorum integration-ready

The Quorum statement must say that the compatibility foundation is prepared. It must not imply that the Cloudflare deployment is connected to or controlled by Quorum.

## Visual System

- Use deep navy and blue for institutional confidence and continuity with the analytical dashboard.
- Reserve amber for primary actions and small emphasis points.
- Give Biomedical and Socio-economic routes distinct, restrained identities while keeping them within the existing palette.
- Use bright neutral surfaces and generous spacing so Home is calmer than the analytical tabs.
- Keep the animated network background subtle around the page shell. It must not reduce hero legibility or compete with content.
- Use a preview captured from the real dashboard rather than generic technology artwork.
- Retain the existing type family and control styling unless accessibility requires a targeted adjustment.

## Component Architecture

Create a dedicated landing presentation rather than simulating the page with chart panels.

```text
DashboardRenderer
├── LandingPage
│   ├── Hero
│   ├── Proof points
│   ├── Capability outcomes
│   ├── Domain routes
│   ├── What-to-try guide
│   └── Delivery status
├── Existing analytical-page renderer
└── Existing FullscreenDisplay
```

`DashboardRenderer` selects the landing presentation when the active page has `pageType: "landing"`. Other pages continue through the existing section-and-panel renderer.

`LandingPage` receives:

- Landing-page configuration
- `onNavigate(pageId)`

It does not read or modify:

- Quorum companion state
- Fullscreen display state
- Loaded analytical data
- Edit mode
- Browser storage

This boundary keeps the landing page portable and minimizes overlap with Phase 5 code.

## Configuration Model

The Home page remains the first entry in `public/config/dashboard.json` and gains a `pageType` and `landing` object.

The `landing` object contains:

- `hero`
- `proofPoints`
- `capabilities`
- `domainRoutes`
- `tourItems`
- `deliveryStatus`
- `previewAsset`

Actions use declarative targets:

- `pageId` for dashboard-tab navigation
- `anchorId` for in-page navigation

The configuration loader and saved-config reconciliation must preserve landing fields. Existing browser-saved configurations from the Cloudflare beta must gain the new default Home metadata without losing local analytical-page edits.

## Data and Interaction Flow

```text
dashboard.json
      ↓
existing dashboard loading and reconciliation
      ↓
DashboardRenderer selects pageType
      ↓
LandingPage renders static configured content
      ├── page action → set active page in DashboardRenderer
      └── anchor action → scroll within LandingPage
```

The preview is an optimized static asset with descriptive alternative text. It is not a live chart, does not depend on panel identifiers, and does not participate in Quorum fullscreen commands.

## Standalone and Quorum Behavior

No companion service is required for the Cloudflare page.

- Normal companion absence must resolve to a calm standalone state.
- The public landing journey must not show an alarming technical failure simply because a local companion is unavailable.
- Genuine catalogue incompatibility or protocol failure remains diagnosable without preventing normal dashboard navigation.
- When Quorum is connected, existing companion commands continue to control analytical charts and fullscreen presentation exactly as Phase 5 specifies.
- The landing page itself is not a Quorum display target in this scope.

## Responsive and Accessible Behavior

- Change the hero from two columns to one, placing the preview below the message.
- Collapse proof points, capability cards, and status cards from three columns to one.
- Keep domain routes as large touch targets.
- Use semantic headings, sections, navigation, and status content.
- Preserve a logical heading order.
- Support complete keyboard navigation with visible focus.
- Do not rely on color alone for delivery status.
- Supply useful alternative text for the dashboard preview.
- Respect `prefers-reduced-motion`.
- Keep the page's purpose and primary route understandable without animation or imagery.

## Resilience

- A page marked as `pageType: "landing"` without a usable `landing` object falls back to its existing section-and-panel content.
- Missing optional content arrays omit only their corresponding section.
- A missing preview asset removes the visual region without removing the hero message or actions.
- An invalid page target hides or disables only the affected action.
- An unknown `pageType` falls back to the existing analytical-page renderer.
- Existing saved configurations receive the new Home defaults through reconciliation.
- Companion absence does not block rendering or navigation.

## Verification

### Configuration and component checks

- Home is the initial page with empty browser storage.
- The landing configuration is validated and rendered.
- Existing saved beta configurations gain landing metadata without losing analytical edits.
- Invalid action targets do not crash the page.
- Missing preview handling preserves content and navigation.

### Navigation checks

- Primary hero action opens Biomedical.
- Biomedical route opens Biomedical.
- Socio-economic route opens Socio-economic.
- `See what to try` scrolls to the correct section.
- Keyboard activation matches pointer activation.

### Standalone and Quorum checks

- Cloudflare mode works without a companion service.
- No companion-related error experience appears during normal standalone use.
- Existing Quorum catalogue, protocol, client, display-controller, and fullscreen tests remain green.
- Connected Quorum display commands still work on analytical pages.

### Visual and accessibility checks

- Inspect desktop, tablet, and phone layouts.
- Inspect keyboard focus order and visible focus indicators.
- Verify heading structure, landmarks, labels, and alternative text.
- Verify reduced-motion behavior.
- Check text and control contrast.
- Confirm no unexpected browser console errors.

### Build checks

- Run the existing test suite.
- Run the Quorum end-to-end tests.
- Run the standard portable build.
- Run the Cloudflare-specific build.
- Treat the documented Vite large-bundle warning as non-failing.

## Release Process

1. Implement and verify on `codex/showcase-home`.
2. Review the landing page in standalone Cloudflare-style operation.
3. Review analytical fullscreen behavior with a Quorum companion.
4. Capture the approved dashboard preview asset and verify its alternative text.
5. Produce a tested candidate commit.
6. Advance `content/cloudflare-beta` only after approval.
7. Optionally tag the approved demonstration candidate as `v0.2.0-beta.1`.

The Cloudflare deployment itself is a separate release action and is not implied by completion of the implementation branch.
