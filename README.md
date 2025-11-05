# 🧩 XEET Chrome Extension

## Summary
The **XEET Chrome Extension** enhances Xeet's creator scoring algorithm by collecting real user feedback, rewarding engagement, and surfacing Xeet signal metrics directly within **X (Twitter)**.  

The goal is to deliver a **lightweight MVP** that can be **iterated quickly**, with hooks for **future scalability** in rewards, analytics, and compliance.

---

## 🎯 Objectives
- **Boost signal quality**: Gather trusted user judgments on creators and posts to refine Xeet scoring models.  
- **Increase engagement**: Introduce low-friction tasks and streak incentives that reward users with Xeets.  
- **Contextualize insights**: Display Xeet scores and signals directly on X profiles, timelines, and Spaces.  
- **Accelerate moderation**: Allow users to flag suspicious content, feeding into Xeet’s moderation workflow.

---

## 🧭 Scope (MVP)
- Chrome Extension built on **Manifest V3** (private or direct install for beta).  
- Supports **Twitter (X)** only.  
- Requires **authenticated Xeet account** with linked X handle.  
- Unauthenticated users see an **onboarding CTA** only.  
- Reward budget limited to **daily randomized grants** (Xeet backend configurable).  
- English-only UI.  

---

## 🔄 Primary User Flows

### 1. Install & Onboard
- User installs the extension and signs in with Xeet.
- Links read-only X permissions (timelines, Spaces presence, profile data).
- Tutorial displayed after authentication.

### 2. Randomized Feedback Prompt
- Extension periodically shows a mini-card asking user to rate a post or creator:
  - **Signal Quality (1–5)**
  - **Authenticity (1–5)**
  - **Sentiment**
  - **Optional Comment (≤280 chars)**
- Response triggers confirmation and logs participation for reward lottery.

### 3. X Profile Augmentation
- On visiting an X profile, show overlay with:
  - Xeet Score
  - Average Signal
  - Recent Rank
  - Trust Badges  
- Overlay links to Xeet portal for detailed analytics.

### 4. X Spaces Tracking
- Detect user presence in X Spaces via DOM observation.
- Log session metadata (Space ID, duration, timestamp).
- Reward participation for staying beyond configured duration (e.g., 10 minutes).

### 5. Reporting & Flagging
- Users can flag suspicious profiles or posts.
- Collects:
  - Reason
  - Optional Screenshot
  - Context (tweet ID, metrics, timestamp)
- Sent securely to Xeet moderation API.

---

## ⚙️ Feature Requirements

### Feedback Tasks
- Fetch candidate posts/accounts via `GET /api/v1/signals/*`.
- Prevent duplicate prompts on the same item within 24h/user.

### Reward System
- Daily pseudo-random reward allocation (configurable).
- Display:
  - Accumulated Xeets
  - Daily cap
  - Streak progress
- Rewards validated server-side via `/api/v1/users/rewards`.

### X Profile Overlay
- Show metrics: Score, Signal, Noise Ratio, Rank, Badges.
- Responsive to X DOM updates (using `MutationObserver`).
- Graceful fallback if no data is available.

### X Spaces Integration
- Detect active Space via `https://twitter.com/i/spaces/*`.
- Respect privacy — no audio capture.
- Grant reward once per valid Space session.

### Reporting
- Provide quick-pick and custom notes (≤500 chars).
- Capture screenshots (`captureVisibleTab`).
- Submit securely via `/api/v1/admin/reports`.

---

## 🧑‍💻 Technical Guidelines

### Stack
- **Manifest V3** + Background Service Worker  
- **React + TypeScript + Vite** build pipeline  
- Reuse existing **Xeet UI components**  

### Authentication
- Use **Xeet Privy OAuth** within popup window.  
- Store tokens via **chrome.storage.session** with **crypto.subtle** encryption.  
- Refresh and revoke tokens automatically.  

### API Communication
- All calls proxied to **xeet-api**.  
- Includes:
  - Debounced submissions
  - Offline caching and retry queue
  - Rate-limiting protection

### Data Privacy & Compliance
- Explicit consent notice for data captured (ratings, Space presence).  
- Opt-out toggles for tracking and feedback.  
- Comply with X’s terms — overlays must be non-disruptive and branded.

### Reward Logic
- Deterministic seed from server-issued daily config.
- Server validates rewards before crediting.

### Telemetry
- Log extension version, usage metrics, and anonymized identifiers.  

---

## 🖌️ UX & Content Guidelines
- Minimal, **non-intrusive overlays** aligned with Xeet branding.  
- Clear CTAs:  
  - “Rate post to earn Xeets”  
  - “View full analytics”  
  - “Flag user”  
- Reward confirmations:  
  - “+5 Xeets added • Thanks for helping improve signals”  
- Daily recap card summarizing tasks and rewards.

---

## 🔒 Security & Abuse Safeguards
- Verify extension hashes before publishing.  
- Signed service worker to prevent tampering.  
- Server-side reward validation (ban checks, rate limits).  
- CAPTCHA challenge for suspicious behavior.  
- Limit feedback/report submissions per user/day.

---

## 🧠 Admin & Backend Touchpoints

### Admin Dashboard
- Metrics:
  - DAU
  - Feedback completed
  - Space participation
- Reward pool controls
- Moderation queue for user reports

### API Additions
| Method | Endpoint | Purpose |
|--------|-----------|----------|
| `POST` | `/api/v1/extension/feedback` | Submit user ratings |
| `POST` | `/api/v1/extension/rewards/claim` | Claim earned rewards |
| `POST` | `/api/v1/extension/reports` | Submit user flags |
| `GET` | `/api/v1/extension/tasks/next` | Fetch next feedback task |
| `GET` | `/api/v1/extension/config` | Retrieve extension configuration |

- Include webhook support for reward confirmations.

---

## 🚀 Future Extensions
- Multi-language UI support.  
- Reward marketplace integration.  
- Broader social integrations (e.g., YouTube, Instagram).  
- Advanced trust scoring visualization.

---

## 🧩 License
© 2025 Xeet. All rights reserved.  
