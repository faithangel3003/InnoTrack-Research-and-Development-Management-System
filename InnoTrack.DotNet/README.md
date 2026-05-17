# InnoTrack.RDMS .NET Module

Production-ready base module for **InnoTrack: Research and Development Management System for Innovation and Collaboration**.

## Stack
- Backend: ASP.NET Core Web API (.NET 10)
- Frontend: Blazor Web App
- Database: XAMPP MySQL/MariaDB
- Security: JWT authentication + RBAC

## Solution
- `InnoTrack.RDMS.Api` REST API with layered architecture
- `InnoTrack.RDMS.Blazor` sample web UI consuming the API

## Architecture
- Domain entities: `Domain/Entities`
- DTOs: `Application/Dtos`
- Interfaces: `Application/Interfaces`
- Services: `Application/Services`
- Repositories: `Infrastructure/Repositories`
- Data context: `Infrastructure/Data/AppDbContext.cs`
- Security: `Infrastructure/Security/JwtTokenService.cs`
- Validation: FluentValidation (`Application/Validators`)
- Middleware: global exception handling (`Middleware/GlobalExceptionMiddleware.cs`)

## RBAC Roles
- Super Admin
- System Admin
- Project Manager
- Team Member

## API Endpoints
- `POST /api/auth/login`
- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `GET /api/users`

## Quick Start
1. Run SQL schema:
   - `database/rdms_module_schema.sql`
2. Start API:
   - `dotnet run --project InnoTrack.RDMS.Api`
3. Start Blazor:
   - `dotnet run --project InnoTrack.RDMS.Blazor`

## Default Login
- Email: `superadmin@innotrack.local`
- Password: `Admin123!`

## Security Notes
- Replace `Jwt:SigningKey` in `appsettings*.json` before production.
- Use HTTPS and secure secrets storage (Azure Key Vault, environment variables, or user secrets).
- Apply DB migrations and least-privilege DB accounts in production.
