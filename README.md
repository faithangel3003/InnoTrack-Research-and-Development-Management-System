# InnoTrack

InnoTrack is a Research and Development Management System with a React frontend, an ASP.NET Core API, and a MySQL-backed tenant model for organizations, teams, projects, tasks, documents, collaboration, subscriptions, and superadmin operations.

## Workspace layout

- `src/`: active React + TypeScript frontend
- `InnoTrack.DotNet/InnoTrack.RDMS.Api/`: primary .NET 10 Web API
- `InnoTrack.DotNet/InnoTrack.RDMS.Blazor/`: secondary Blazor client
- `migrations/` and `InnoTrack.DotNet/database/`: SQL bootstrap assets

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind, React Router, React Hook Form, Zod
- Backend: ASP.NET Core Web API on .NET 10, SignalR, FluentValidation, Serilog
- Database: MySQL / MariaDB
- Auth and security: JWT, RBAC, rate limiting, sanitization, encryption from `.env`

## Prerequisites

- Node.js 22+
- npm 10+
- .NET SDK 10.0.x
- MySQL or MariaDB

## Environment

The API reads configuration from a repo-root `.env` file through `DotEnvBootstrapper`. Use `.env.example` as the template for local setup.

Required values include:

- API and frontend URLs
- JWT issuer, audience, signing key, and expiry
- AES encryption key and IV in Base64 format
- MySQL connection settings
- reCAPTCHA site and secret keys for local auth flows
- SMTP settings when you need to test OTP/password-recovery emails

For local login testing, use the official Google reCAPTCHA test keys or explicitly disable reCAPTCHA in your local configuration. Localhost requests no longer bypass verification automatically.

## Local setup

1. Install frontend dependencies:

```bash
npm ci
```

2. Create a local `.env` from `.env.example` and fill in the real values.

3. Initialize the database if needed. The repo includes SQL assets under `migrations/` and `migrations/mysql/` for local XAMPP/MySQL setups.

4. Start the main application stack:

```bash
npm run dev:full
```

This starts:

- the .NET API on `http://localhost:5110`
- the Vite frontend on `http://localhost:5174`

`npm run dev:full` now clears stale local listeners on the app ports before startup and launches the API from a fresh isolated build output under `InnoTrack.DotNet/build-validation/dev-api`, which avoids the stale-runtime and locked-output issues that were showing up during local debugging.

If you need to inspect local OTP/password-recovery emails, point the API SMTP settings at an external sandbox such as Mailpit or MailHog. A bundled inbox viewer is no longer included in the npm toolchain.

Useful alternatives:

```bash
npm run clean:dev
npm run dev:web
npm run dev:api
npm run dev:mail
```

## Validation

Use the repo-standard validation command before shipping changes:

```bash
npm run validate
```

That runs:

- `eslint .`
- the frontend production build
- the API build into an isolated validation output folder to avoid file-lock issues from a running local API instance

## Notes

- The React app is the primary active frontend in this workspace.
- The Blazor app is still present and can be run independently if needed.
- The API bootstraps some legacy-compatible schema elements at startup, so the runtime database shape may be normalized beyond the base SQL files.

## CI

GitHub Actions validation is defined in `.github/workflows/ci.yml` and mirrors the local `npm run validate` flow.
