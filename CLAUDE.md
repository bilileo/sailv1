# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite configured.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Architecture

**SAIL** (Sistema de Asistencias e Ingreso a Laboratorios) is a Next.js 16 App Router application for managing lab attendance at a university.

### Stack
- Next.js 16 + React 19 + TypeScript, App Router (no Pages Router)
- Tailwind CSS v4 for styling
- Supabase (PostgreSQL) for persistent data
- NextAuth v4 with CredentialsProvider for auth (roles: `ADMIN`, `AUXILIAR`, `MAESTRO`)
- `data/database.json` for ephemeral per-lab QR codes with TTL
- `sonner` for toasts, `lucide-react` for icons

### Dual Storage Pattern
All business data lives in Supabase. The file `data/database.json` holds only the currently active QR code per lab (`activeCodes: Record<labId, { code, expiresAt } | null>`). Codes rotate every 60 seconds and expire server-side. `app/lib/db.ts` provides `readDB()`/`writeDB()` for this file; `app/lib/supabase.ts` exports the Supabase client.

### Roles & Access
The middleware (`middleware.ts`) protects `/` and `/api/clases/:path*`, `/api/laboratorios/:path*`. Role determines what tabs are visible:
- `ADMIN`: full access to all tabs
- `AUXILIAR`: same as ADMIN minus Administradores/Auxiliares tabs
- `MAESTRO`: only Inicio + Incidencias; can only see/edit their own classes; cannot create/delete classes

### Supabase Schema (key tables)
- `User` — system users (admins, teachers, auxiliaries)
- `Student` — student records (separate from User)
- `Laboratory` — physical labs
- `ClassSession` — scheduled class (fields: `dayOfWeek` 1–7 where 1=Mon, 7=Sun; `startTime`/`endTime` as `HH:MM:SS`; `status`: ACTIVE | ENDED | MAINTENANCE; `teacherId`, `laboratoryId`, `asignaturaId`, `grupo`)
- `Asignatura` — subjects/courses (name, materiaCode, color)
- `Attendance` — attendance record per student per session (status: PRESENT | LATE | LEFT_EARLY | ABSENT | UNAUTHORIZED)
- `DeviceType` — device types used by students (resolved/created on write)
- `Imparte` — many-to-many teacher↔subject join table
- `Incident` — incident reports from teachers

### Day-of-Week Convention
`dayOfWeek` in the DB uses PostgreSQL convention (1=Monday … 7=Sunday). JavaScript's `Date.getDay()` uses 0=Sunday … 6=Saturday. Conversion: `dbDay === 7 ? 0 : dbDay`. Both `app/page.tsx` and `app/maestro/dashboard/page.tsx` contain this mapping.

### App Structure
```
app/
  page.tsx                      # Main dashboard (ADMIN/AUXILIAR/MAESTRO home)
  FormularioClase.tsx           # Create-class modal
  CatalogoClases.tsx            # Subject catalog management tab
  Alumnos.tsx                   # Student management tab
  GestionUsuarios.tsx           # User management (renders for ADMIN/AUXILIAR/MAESTRO roles)
  GestionIncidencias.tsx        # Incident management tab
  lib/
    attendance-types.ts         # Shared TypeScript interfaces
    db.ts                       # JSON file DB for active QR codes
    supabase.ts                 # Supabase client singleton
  api/
    auth/[...nextauth]/         # NextAuth handler
    clases/                     # ClassSession CRUD (GET filters by role)
    laboratorios/               # Lab list
    maestros/                   # Teacher list
    usuarios/                   # User CRUD
    catalogo/                   # Asignatura list
    asistencia/                 # Attendance CRUD
    imparte/                    # Teacher-subject assignment
    incidencias/                # Incident CRUD
    estudiante/                 # Student lookup + QR-based registration
    estudiante/login/           # Student auth (separate from NextAuth)
  maestro/
    dashboard/
      page.tsx                  # In-class view: live QR code + student list
      actions.ts                # Server Actions: getStudents, registerStudent, updateActiveCode, etc.
    login/                      # Teacher login
    register/                   # Teacher registration
    join/                       # Student QR-scan entry page
  login/                        # Admin/Auxiliar login
services/
  claseService.ts               # (client-side service helpers)
```

### Polling Strategy
- Main dashboard (`app/page.tsx`): polls all data every 5 seconds via `setInterval`
- Teacher dashboard (`app/maestro/dashboard/page.tsx`): polls students every 3 seconds only while class is `inProgress`
- Class phase is re-evaluated every 30 seconds; automatically marks sessions `ENDED` when time passes

### API Pattern
Each route file exports named handlers (`GET`, `POST`, `PUT`, `DELETE`). Most routes create their own Supabase client inline; `app/api/asistencia/route.ts` imports the shared client from `app/lib/supabase.ts`. The `GET /api/clases` route reads the NextAuth JWT to apply role-based filtering (MAESTROs only see their own classes).
