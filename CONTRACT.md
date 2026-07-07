# Mobile Application Development Agreement

## The Business of Happiness Mobile Application

This Mobile Application Development Agreement (the "Agreement") is entered into as of **____________, 2026** (the "Effective Date") by and between:

- **Developer:** Leif MacCarthy, operating as (or on behalf of) **LM Group, LLC**, a limited liability company organized under the laws of the State of **Maine** ("Developer"); and
- **Client:** Dr. Tarryn MacCarthy, owner of **The Business of Happiness** ("Client").

Developer and Client are each a "Party" and collectively the "Parties."

---

## 1. Scope of Work

Developer agrees to design, build, and deliver a cross-platform (iOS and Android) mobile application (the "App") as specified in the project requirements document (`REQUIREMENTS.md`, incorporated by reference as **Exhibit A**). The scope includes:

### 1.1 Technology Stack

- React Native with Expo (SDK 56), React, TypeScript
- Supabase (authentication, database, storage, edge functions)
- NativeWind CSS for styling
- expo-notifications for push notifications
- Supabase Auth with social single sign-on (SSO)

### 1.2 Core Features

1. **Start Here (Home):** Personalized welcome screen, per-course and app-wide announcements, a "Hop back in" section resuming in-progress videos, and a settings page linking to login/logout, Privacy Policy, and Terms of Service.
2. **Community:** Per-course communities plus an app-wide "Business of Happiness" community; posting of text, photos, and videos; text and image responses; user tagging; direct messaging between users; a "Reach Out Here" button routing messages to Client and admin staff, with email forwarding via a Supabase function to Client-designated addresses; push notifications for admin-posted content and admin responses.
3. **Course Access:** Whitelist-based course access (email-mapped, with manual whitelist fallback managed via Supabase); course structure including a Welcome section, Nervous System Regulation Vault, Meditation and Visualization Vault, scheduled Modules with go-live dates, Lessons (titled videos with playback-speed control, PDFs, and audio recordings), lesson-completion tracking with persistent playback progress, and a Live Session Recordings section.
4. **Resources:** User-favorited clips, audios, PDFs, and lessons, default-sorted and filterable by type.
5. **Roles:** User, Admin, and Tarryn (primary admin) role behavior as specified in Exhibit A.
6. **Admin Portal** A basic admin portal webapp for content management, content deletion, and whitelist management.

### 1.3 Exclusions

The following are expressly **out of scope** for this Agreement and, if requested, will be quoted separately:

- In-app purchases of meditations and audios (identified as v2)
- Offline access to course content (identified as v2)
- FunnelBreezy purchase-webhook integration beyond email-based whitelist mapping in the admin portal (identified as v2)
- Ongoing content creation or content uploading on Client's behalf

## 2. Deliverables

1. Complete, documented source code for the App, delivered via a private Git repository.
2. Configured Supabase project (database schema, storage buckets, edge functions, auth configuration).
3. Submission of the App to the Apple App Store and Google Play Store, through to approval.
4. A written handoff document covering account credentials structure, content-upload procedures via the admin portal, and whitelist management.

## 3. Timeline

| Milestone | Description |
|---|---|
| M1 | Project setup, auth with social SSO, Start Here screens, settings/legal links |
| M2 | Course access, whitelisting, vaults, modules/lessons with progress tracking, Resources |
| M3 | Community, DMs, Reach Out Here with email forwarding, push notifications |
| M4 | Testing, App Store and Play Store submission, approval, handoff |

App store review timelines are outside Developer's control. Delays caused by Client (late content, credentials, or feedback beyond five (3) business days) extend the timeline day-for-day.

## 4. Compensation

### 4.1 Development Fee

Client shall pay Developer a fixed fee of **$10,000 USD** (the "Development Fee"), payable as follows:

| Payment | Amount | Due |
|---|---|---|
| Deposit | $2,000 | Upon signing this Agreement |
| Milestone payment | $3,000 | Upon acceptance of Milestone M3 |
| Final payment | $5,000 | Upon acceptance of Milestone M4 (store approval and handoff) |

Invoices are due within fifteen (15) days of receipt. Work on a subsequent milestone will not begin until the prior invoice is paid.

### 4.2 Startup and Third-Party Costs (Client Responsibility)

The following costs are **in addition to** the Development Fee and are the responsibility of Client. Where accounts must be in Client's name (Apple, Google, Supabase), Client shall pay the vendor directly; Developer will assist with setup.

| Item | Estimated Cost | Frequency |
|---|---|---|
| LLC formation for Developer's business entity (state filing fee) | $350 | One-time |
| Apple Developer Program membership | $99 | Annual |
| Google Play Console developer account | $25 | One-time |
| Supabase Pro plan (database, auth, storage) | $25/month base, plus usage | Monthly |
| Video/media storage and bandwidth overage (Supabase) | $10 – $100/month depending on content volume and user count | Monthly |
| Transactional email provider (for Reach Out Here forwarding) | $0 – $20/month or existing | Monthly |
| Domain and legal-page hosting (thebizofhappiness.com) | Client's existing cost | — |

Estimates are provided in good faith as of the Effective Date and are set by third-party vendors, not Developer.

### 4.3 Maintenance (Post-Launch)

For twelve (12) months following launch, Developer will provide maintenance at **$150/month**, covering:

- Bug fixes for delivered functionality
- Dependency, Expo SDK, and OS-compatibility updates
- App store compliance updates (resubmissions required by Apple/Google policy changes)
- Monitoring of Supabase functions and push-notification delivery
- Up to two (2) hours per month of minor content/configuration support

Work beyond this scope (new features, v2 items) will be billed at **$75/hour** or quoted as a fixed price, at Client's election. Either Party may cancel maintenance with thirty (30) days' written notice. The first thirty (30) days after launch are covered at no charge as a warranty period for defects in delivered work.

## 5. Client Responsibilities

Client shall, at its own expense and in a timely manner:

1. Provide all course content (videos, audio, PDFs, titles, schedules), branding assets, and copy.
2. Establish and maintain the Apple Developer, Google Play, and Supabase accounts in Client's name.
3. Provide the Privacy Policy and Terms of Service (currently hosted at thebizofhappiness.com/legal).
4. Review milestone deliverables and provide written acceptance or itemized revision requests within five (3) business days. Deliverables not rejected within that window are deemed accepted.

## 6. Change Requests

Requests that materially alter the scope in Exhibit A must be agreed in a written change order stating the impact on fee and timeline before work begins. Minor clarifications within the existing scope are included.

## 7. Intellectual Property

1. Upon receipt of full payment of the Development Fee, Developer assigns to Client all right, title, and interest in the App's source code and deliverables created specifically for Client under this Agreement.
2. Developer retains ownership of pre-existing tools, libraries, and generalized know-how, and grants Client a perpetual, non-exclusive, royalty-free license to any such materials embedded in the deliverables.
3. Third-party and open-source components remain subject to their respective licenses.
4. Client retains all ownership of its content, branding, and trademarks. Until full payment, Developer retains ownership of the deliverables and Client's use is licensed, not assigned.

## 8. Confidentiality

Each Party shall keep confidential the other Party's non-public business, technical, and user information, and shall use it only to perform this Agreement. User data in the App shall be handled in accordance with Client's Privacy Policy and applicable law. This obligation survives termination for three (3) years.

## 9. Warranties and Disclaimers

1. Developer warrants that the deliverables will materially conform to Exhibit A for thirty (30) days after launch, and will correct non-conformities in that period at no charge.
2. Developer does not warrant uninterrupted or error-free operation of third-party services (Apple, Google, Supabase, email providers, Expo), and is not liable for their outages, pricing changes, or policy decisions, including app store rejection for reasons outside Developer's control.
3. EXCEPT AS STATED ABOVE, THE DELIVERABLES ARE PROVIDED "AS IS" AND DEVELOPER DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.

## 10. Limitation of Liability

Neither Party shall be liable for indirect, incidental, consequential, or punitive damages, or lost profits. Each Party's total aggregate liability under this Agreement shall not exceed the total fees actually paid by Client to Developer hereunder. Nothing in this section limits liability for willful misconduct or breach of Section 8.

## 11. Termination

1. Either Party may terminate for material breach if the breach is not cured within fifteen (15) days of written notice.
2. Client may terminate for convenience on fifteen (15) days' written notice. Upon such termination, Client shall pay for all work completed through the termination date (pro-rated against the milestone schedule), and Developer shall deliver all work product completed and paid for.
3. The deposit is non-refundable once Milestone M1 work has begun.
4. Sections 7 through 10 and 12 survive termination.

## 12. General

1. **Independent Contractor.** Developer is an independent contractor, not an employee, partner, or agent of Client.
2. **Governing Law.** This Agreement is governed by the laws of the State of Maine, without regard to conflict-of-law principles.
3. **Dispute Resolution.** The Parties will first attempt good-faith negotiation; unresolved disputes shall be submitted to mediation before litigation.
4. **Entire Agreement.** This Agreement, including Exhibit A, is the entire agreement between the Parties and supersedes all prior discussions. Amendments must be in writing and signed by both Parties.
5. **Assignment.** Neither Party may assign this Agreement without the other's written consent, except to a successor in interest.
6. **Notices.** Notices shall be sent in writing to the email addresses below and are effective upon confirmed receipt.

---

## Signatures

**DEVELOPER**

Signature: ______________________________

Name: Leif MacCarthy

Title: ______________________________

Email: lm160@rice.edu

Date: ______________________________

**CLIENT**

Signature: ______________________________

Name: Dr. Tarryn MacCarthy

Title: Owner, The Business of Happiness

Email: tarryn@drtarrynmaccarthy.com

Date: ______________________________

---

**Exhibit A:** Project Requirements (`REQUIREMENTS.md`), attached and incorporated by reference.
