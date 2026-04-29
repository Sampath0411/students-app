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

| Badge | Used in this repo for |
| --- | --- |
| ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) | Building all UI pages and reusable components |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) | Type-safe frontend code, hooks, context, and Supabase integrations |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) | Local development server and production bundling |
| ![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white) | Public/admin/student route navigation and protection flow |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) | Utility-first styling and responsive layout system |
| ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-111111?style=for-the-badge&logo=shadcnui&logoColor=white) | UI component layer for forms, dialogs, tables, and shells |
| ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radixui&logoColor=white) | Accessible UI primitives used under shadcn components |
| ![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white) | Query client provider and async request orchestration |
| ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white) | Auth, Postgres database, RLS policies, and API access |
| ![Supabase Edge Functions](https://img.shields.io/badge/Supabase_Edge_Functions-0F172A?style=for-the-badge&logo=supabase&logoColor=3FCF8E) | Server-side functions: `admin-create-student`, `chat-ai`, `seed-admin` |
| ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white) | Unit/integration test runner in `src/test` |
| ![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white) | Component test utilities and assertions |

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
