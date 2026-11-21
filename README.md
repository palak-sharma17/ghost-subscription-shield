# 🛡️ Ghost Subscription Shield

**A Mediated Payment Gateway & Virtual Shield for Automated Subscription Management**

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Status](https://img.shields.io/badge/status-proof--of--concept-8b5cf6)

> Stop paying for subscriptions you forgot. Cap every charge, catch zombie subscriptions early, and cancel in one tap.

Ghost Subscription Shield is a **middleware financial buffer** that sits between a consumer's payment source and their subscription vendors. It gives users **visibility** (dashboard and analytics), **control** (per-vendor spending caps) and an easy **exit** (a one-tap Kill Switch) so they pay only for the subscriptions they actually use.

> ⚠️ **This is a proof-of-concept for academic purposes.** The payment mediator is **simulated** (Stripe Sandbox / API mocks). **No real money moves and no real banking credentials are collected.**

---

## 📑 Table of Contents

1. [Live Demo](#-live-demo)
2. [The Problem](#-the-problem)
3. [Features](#-features)
4. [How It Works](#-how-it-works)
5. [Tech Stack](#-tech-stack)
6. [System Architecture](#-system-architecture)
7. [Project Structure](#-project-structure)
8. [Getting Started](#-getting-started)
9. [Database Setup](#-database-setup)
10. [Usage Walkthrough](#-usage-walkthrough)
11. [Security](#-security)
12. [Testing](#-testing)
13. [Deployment](#-deployment)
14. [Limitations](#-limitations)
15. [Roadmap](#-roadmap)
16. [Team](#-team)
17. [Acknowledgements](#-acknowledgements)
18. [License](#-license)

---

## 🌐 Live Demo

| Item | Link |
| --- | --- |
| Live application (Vercel) | https://ghost-subscription-shield.vercel.app/login |
| Source code | https://github.com/spremanjal-del/ghost-subscription-shield |

Create your own account on the sign-up page to try the app. Please use a throwaway email and a test password; never reuse a real password.

<!-- Add screenshots here: replace the paths with your own image files -->
<!--
![Dashboard](docs/screenshots/dashboard.png)
![Kill Switch](docs/screenshots/kill-switch.png)
-->

---

## 🎯 The Problem

The modern digital economy runs on subscriptions and automated recurring billing. That convenience hides four risks:

| Risk | What happens |
| --- | --- |
| **Forgotten subscriptions** | Users keep paying for services they no longer use. |
| **Zombie charges** | Small recurring fees add up unnoticed. |
| **Opaque cancellation** | Dark patterns make leaving deliberately hard. |
| **Price creep** | Vendors raise prices without clear consent. |

Banking apps do not understand subscriptions, manual trackers cannot block payments, and commercial managers still send you back to the vendor's own cancellation flow. Ghost Subscription Shield is an **active layer** that can act on the user's behalf instead of only reporting what already happened.

---

## ✨ Features

### Core features

- **📊 Centralized dashboard** – monthly spend, projected annual spend and spend by category.
- **🧟 Zombie detection** – flags any subscription unused for **more than 30 days**.
- **📈 Zombie Risk Score** – an explainable, weighted heuristic that warns *before* day 30 (states: Active, At-Risk, Zombie).
- **🧱 Spending-cap enforcement** – set a cap per vendor; the mediator blocks charges above it, raises an alert and logs the event.
- **🔪 One-tap Kill Switch** – confirms, revokes the (simulated) payment mandate, logs the action and opens the vendor's cancellation link.
- **🏦 Bank-feed scanner (simulated)** – finds repeating merchant debits with similar amounts that are not registered as subscriptions.
- **🤖 Shield Assistant** – answers questions about the user's own subscription data in plain language.
- **🧾 Activity log** – append-only record of caps, blocks and Kill Switch use.
- **🔎 Search, filter and sort** – manage many subscriptions quickly.
- **🔐 Authentication** – email/password sign-up and login with a protected dashboard.

### Extended demonstration build

The hosted demonstration build adds further features:

- **🛍 Subscription Store** – browse plans with prices (sample data) and buy in one tap.
- **♻️ Swap & Save** – replaces a zombie subscription with a cheaper plan in the same category.
- **💬 Assistant with chat history** – open-ended answers, saved past chats, and action buttons that need confirmation.
- **🧭 Guided app tour and hover hints** – step-by-step onboarding and a hint on every icon.
- **🛡 Abuse protection** – login lockout, rate limiting, input limits and escaped output.

---

## ⚙️ How It Works

Illustrative scenario: a forgotten Netflix Premium plan (₹649 / month).

| When | What the Shield does |
| --- | --- |
| **Day 14** – no activity | Flags Netflix as **At-Risk**. |
| **Day 30** | Marks it a **Zombie** and alerts the user. |
| **Price increase** | The vendor cap **blocks** any charge above the limit. |
| **User decision** | The **Kill Switch** revokes the mandate in one tap and opens the vendor link. |

Without the Shield the user would have paid ₹1,947 over three months for a service they never opened.

---

## 🧰 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide Icons (dark theme) |
| Backend & Database | Supabase: PostgreSQL, Auth, Row Level Security |
| Server logic | Next.js Server Components and Server Actions |
| Payments (simulated) | Stripe Sandbox, payment-gateway API mocks |
| Delivery | Git, GitHub, Vercel |

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────┐
│ PRESENTATION      Next.js · React · TypeScript         │
│ Dashboard · Risk view · Kill Switch modal · Assistant  │
└───────────────────────────┬────────────────────────────┘
                            │ Server Actions
┌───────────────────────────▼────────────────────────────┐
│ LOGIC & DATA      Supabase (PostgreSQL + Auth + RLS)   │
│ CRUD · Risk engine · Cap checks · Activity logging     │
└───────────────────────────┬────────────────────────────┘
                            │ cap / mandate calls
┌───────────────────────────▼────────────────────────────┐
│ PAYMENT MEDIATOR  (simulated)                          │
│ Charge approve/decline · Mandate actions · Bank parser │
└────────────────────────────────────────────────────────┘
```

**Spending-cap decision flow:** *charge request → look up subscription and cap → approve if active and within cap, otherwise decline → log the decision.*

---

## 📁 Project Structure

> The tree below is approximate. Adjust it to match your repository.

```
ghost-subscription-shield/
├── app/                    # Next.js App Router (pages, layouts, Server Actions)
│   ├── login/              # Sign-up and login
│   └── dashboard/          # Protected dashboard
├── components/             # UI components (cards, modals, charts)
├── lib/
│   └── supabase/           # Browser client and server-side client
├── public/                 # Static assets
├── .env.example            # Environment variable template (no secrets)
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (or yarn / pnpm)
- **Git**
- A free **Supabase** project

### 1. Clone the repository

```bash
git clone https://github.com/spremanjal-del/ghost-subscription-shield.git
cd ghost-subscription-shield
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a file named `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Find both values in Supabase under **Project Settings → API**.

> 🔒 Never commit `.env.local`, and never put a service-role or secret key in client-side code. Confirm `.env*` is listed in `.gitignore`.

### 4. Set up the database

Follow [Database Setup](#-database-setup) below.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run the linter |

---

## 🗄 Database Setup

Open the Supabase **SQL Editor** and run the following. Column names are illustrative; adapt them to your real schema.

```sql
-- Subscriptions owned by a user
create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vendor        text not null,
  plan          text,
  amount        numeric(10,2) not null check (amount >= 0),
  billing_cycle text not null default 'monthly',
  spending_cap  numeric(10,2),
  last_used_at  timestamptz,
  status        text not null default 'active'
                check (status in ('active','paused','cancelled','zombie')),
  risk_score    int  not null default 0 check (risk_score between 0 and 100),
  created_at    timestamptz not null default now()
);

-- Append-only activity record
create table public.activity_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  action          text not null,
  details         jsonb,
  created_at      timestamptz not null default now()
);

-- Row Level Security: each user sees only their own rows
alter table public.subscriptions enable row level security;
alter table public.activity_log  enable row level security;

create policy "own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own activity" on public.activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Authentication note:** if sign-up fails with "Database error saving new user" or users cannot log in right after sign-up, check **Authentication → Providers → Email** and the email-confirmation setting.

---

## 🧭 Usage Walkthrough

1. **Sign up** with an email and password, then log in.
2. **Add subscriptions** with the *Add Subscription* button (vendor, amount, billing cycle, last-used date).
3. Read the **dashboard**: monthly spend, yearly projection and spend by category.
4. Check the **risk score** and state (Active / At-Risk / Zombie) on each subscription. Use search, filter and sort to focus on the worst offenders.
5. Set a **spending cap** on a vendor. A charge above the cap is blocked and logged.
6. Press the **Kill Switch**, confirm, and the mandate is revoked and the vendor's cancellation link opens.
7. Run the **bank-feed scanner** to find recurring debits you have not registered.
8. Ask the **Shield Assistant** things like *"Which subscriptions are unused?"* or *"How much do I spend each month?"*.
9. Review everything in the **activity log**.

---

## 🔐 Security

| Concern | Approach |
| --- | --- |
| Authentication | Supabase Auth (email/password); protected dashboard routes |
| Data isolation | Row Level Security on every table: `auth.uid() = user_id` |
| Sessions | Dedicated server-side Supabase client for Server Components and Server Actions |
| Data minimisation | No banking passwords; only subscription-management data is stored |
| Secrets | Environment variables only; never committed to Git |
| Abuse resistance (demo build) | Login lockout, rate limiting, input limits, escaped output, hashed passwords |

Security is enforced at the **database layer**, not only through what the frontend shows.

> Network-level DoS filtering and malware scanning are provided by the hosting platform (Vercel) and the database service (Supabase). No application can honestly promise protection against every type of attack.

---

## 🧪 Testing

The project was validated with mock transactions and manual end-to-end testing.

| Area | What is checked |
| --- | --- |
| Authentication | Sign-up, login, wrong password, protected-route redirect |
| Subscriptions | Add, edit, delete, totals and annual projection |
| Detection | Zombie rule (30+ days) and risk score with explanation |
| Spending cap | Charge above cap is blocked and logged; within cap is approved |
| Kill Switch | Mandate revoked, status updated, event logged, vendor link opens |
| Scanner | Unregistered recurring debits detected from a sample feed |
| Privacy | A second user cannot read another user's rows (RLS) |

---

## ☁️ Deployment

The app is deployed on **Vercel**.

1. Push the repository to GitHub.
2. In Vercel choose **Add New → Project** and import the repository.
3. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Click **Deploy**. Every push to the main branch redeploys automatically.
5. In Supabase **Authentication → URL Configuration**, add your Vercel URL as an allowed site/redirect URL.

---

## ⚠️ Limitations

- Proof-of-concept: payments, mandates and bank feeds are **simulated**.
- No live bank or Account Aggregator integration, and no live vendor mandate APIs.
- The Kill Switch removes intermediary retention screens, but vendor-side steps may still be required.
- The Shield Assistant understands a limited set of question types; open-ended AI answers depend on the hosting platform.
- Store prices in the demonstration build are sample data.
- Not security-audited and not checked against formal regulatory requirements (for example RBI mandate rules).

---

## 🗺 Roadmap

- [ ] **Real bank data** through the RBI Account Aggregator framework, with user consent
- [ ] **Real mandate control** via card e-mandate and UPI AutoPay management
- [ ] **Shield Wallet** – a bank-linked virtual wallet with per-subscription virtual cards and hard caps (needs an RBI-authorised partner)
- [ ] **Progressive Web App / mobile app** with push notifications
- [ ] **Smarter prediction** – a trained zombie-prediction model, price-hike predictor, overlap and bundle finder
- [ ] **LLM-powered assistant** grounded in the user's own data, with confirmation for every action
- [ ] **Browser extension** to capture real usage signals
- [ ] **Compliance and security review**

---

## 👩‍💻 Team

B.Tech Computer Science & Engineering (VII Semester), Govt. Mahila Engineering College, Ajmer, affiliated to Bikaner Technical University, Bikaner. Session 2026–27.

| Name | Roll No. | Contribution |
| --- | --- | --- |
| Nishtha Pandya | 23EEMCS079 | Requirement analysis, literature review, UI/UX design direction |
| Palak Sharma | 23EEMCS081 | Frontend: dashboard, risk-score view, filters, Kill Switch and Add Subscription modals |
| Premanjal Sharma | 23EEMCS098 | Backend and database: Supabase schema, RLS, authentication, Server Actions, deployment |
| Richa Shrivastava | 23EEMCS105 | Core logic and testing: zombie detection, risk scoring, cap enforcement, assistant, end-to-end tests |

**Project guide:** Mr. Dalpat Songara, Assistant Professor, Department of Computer Science & Engineering.

---

## 🙏 Acknowledgements

- Our guide, Mr. Dalpat Songara, and the faculty of the Department of CSE for their guidance.
- The documentation and communities of Next.js, React, Supabase, Tailwind CSS, shadcn/ui, Stripe and Vercel.
- Research and guidance on dark patterns: Luguri & Strahilevitz (2021), the US FTC report "Bringing Dark Patterns to Light" (2022), and India's Guidelines for Prevention and Regulation of Dark Patterns (2023).

---

## 📄 License

This is an academic project. Choose a license before sharing the code publicly (for example MIT) and add a `LICENSE` file; until then all rights remain with the authors.

---

<p align="center">Made with ☕ by the Ghost Subscription Shield team · Proof-of-concept · 2026–27</p>



