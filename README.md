# Scholaris — Students App

A full-stack student management platform with separate **student** and **admin** experiences, built with **React + Vite + TypeScript** and powered by **Supabase** for auth, database, and Edge Functions.

## What this project includes

### Student side
- Account registration and login
- Personal dashboard and profile
- Attendance history with date-range filters and stats
- Assignments, announcements, notifications, and records views
- AI study assistant chat with per-student conversations

### Admin side
- Admin login and protected admin routes
- Student approval and student management
- Manual attendance marking and editing
- Attendance reports
- QR scan flow and QR lock/unlock controls
- Student export to Excel (`.xlsx`)
- Timetable, assignment, records, and announcement management

## Tech stack

| Symbol | Tech | Used in this repo |
| --- | --- | --- |
| ⚛️ | React 18 | App UI, page components, dashboards, and role-based screens |
| 🟦 | TypeScript | Type-safe components, hooks, auth context, and Supabase integration |
| ⚡ | Vite | Fast dev server and production bundling |
| 🧭 | React Router | Public, student, and admin route navigation |
| 🎨 | Tailwind CSS | Utility-first styling and design system tokens |
| 🧩 | shadcn/ui + Radix UI | Reusable accessible UI components |
| 📦 | TanStack Query | Query client provider and async data orchestration |
| 🛢️ | Supabase (Auth + Postgres + RLS) | Authentication, database tables, and access control |
| ☁️ | Supabase Edge Functions | `admin-create-student`, `chat-ai`, and `seed-admin` server logic |
| 🧪 | Vitest + Testing Library | Unit/integration testing setup in `src/test` |

## Project structure

```text
students-app/
├─ public/                         # Static assets
├─ src/
│  ├─ components/
│  │  ├─ ui/                       # shadcn/ui primitive components
│  │  ├─ AppShell.tsx              # Shared layout shell (student/admin)
│  │  └─ ProtectedRoute.tsx        # Role-gated route wrapper
│  ├─ contexts/
│  │  └─ AuthContext.tsx           # Session, role, status bootstrap
│  ├─ hooks/                       # Shared hooks
│  ├─ integrations/
│  │  └─ supabase/
│  │     ├─ client.ts              # Supabase client initialization
│  │     └─ types.ts               # Generated database types
│  ├─ pages/
│  │  ├─ admin/                    # Admin pages
│  │  ├─ student/                  # Student pages
│  │  ├─ Landing.tsx
│  │  ├─ Login.tsx
│  │  └─ Register.tsx
│  ├─ test/                        # Vitest setup and tests
│  ├─ App.tsx                      # Route map
│  └─ main.tsx                     # App bootstrap
├─ supabase/
│  ├─ migrations/                  # SQL migrations
│  ├─ functions/
│  │  ├─ admin-create-student/     # Create student user flow
│  │  ├─ chat-ai/                  # Streaming AI chat function
│  │  └─ seed-admin/               # Admin seed helper
│  └─ config.toml                  # Supabase local config
├─ package.json
└─ vite.config.ts
```

## Route overview

### Public routes
- `/` landing page
- `/register` student registration
- `/login` student login
- `/admin/login` admin login

### Student protected routes
- `/dashboard`, `/notifications`, `/assignments`, `/records`
- `/announcements`, `/profile`, `/attendance`, `/chatbot`

### Admin protected routes
- `/admin`, `/admin/pending`, `/admin/students`, `/admin/attendance`
- `/admin/scan`, `/admin/timetable`, `/admin/assignments`
- `/admin/records`, `/admin/announcements`
- `/admin/edit-attendance`, `/admin/reports`, `/admin/settings`

## Getting started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-supabase-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

### 3) Start development server

```bash
npm run dev
```

## Available scripts

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run build:dev` — development-mode build
- `npm run preview` — preview built app
- `npm run lint` — run ESLint
- `npm run test` — run tests once
- `npm run test:watch` — run tests in watch mode

## Supabase notes

- SQL schema changes live in `supabase/migrations/`
- Edge Functions live in `supabase/functions/`
- AI chat function expects a Supabase secret:
  - `LOVABLE_API_KEY`

## Authentication and authorization

- Supabase Auth manages user sessions
- Role and status are loaded in `AuthContext` from database metadata
- Route access is enforced with `ProtectedRoute`
- Admin/student separation is role-based

## License

This repository currently has no explicit license file. Add a `LICENSE` file if you want to define usage terms.
