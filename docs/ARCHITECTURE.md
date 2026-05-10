# Architecture Guide

## Domain Model

```txt
Workspace
  Teams
    Departments
      Employees
    Projects
      Tasks
        Subtasks
        Comments
        Attachments
        Activity history
```

## Backend Layers

- `routes/`: HTTP endpoint wiring and middleware composition.
- `validators/`: Zod schemas for request contracts.
- `controllers/`: HTTP orchestration, request/response handling.
- `services/`: cross-cutting business workflows such as audit logging.
- `services/hierarchyService.js`: recursive organization traversal, reporting chain lookup, descendant lookup, and manager reassignment safeguards.
- `repositories/`: database query composition and pagination/sorting helpers.
- `models/`: Mongoose schemas and indexes.
- `middleware/`: auth, CSRF, uploads, error handling, validation.
- `helpers/`: reusable response and query primitives.
- `config/`: database and Socket.io setup.

## Frontend Layers

- Redux is kept for global client state: auth, theme, notifications.
- TanStack Query is used for server-state caching in calendar, projects, project detail, notifications, and activity screens.
- Routes are lazy-loaded for code splitting.
- Reusable UI primitives live under `components/ui`.
- Reusable pagination and activity feed components keep high-volume lists consistent.
- Real-time project board events are isolated in `api/socket.js`.

## Security Model

- Short-lived access tokens.
- Rotating refresh tokens stored in HTTP-only cookies.
- Session records persisted in MongoDB and revocable on logout/password reset.
- CSRF double-submit token for mutating cookie-authenticated requests.
- Helmet, CORS allow-listing, rate limiting, Mongo sanitization, validation, and audit logs.
- Hierarchical access control prevents non-admin users from seeing projects and tasks outside their reporting tree.

## Organization Hierarchy

Users store direct references for `managerId`, `teamLeadId`, `department`, `companyId`, `hierarchyLevel`, and cached `subordinates`. Recursive reads use MongoDB `$graphLookup`, which avoids expensive application-level loops and keeps the tree scalable for manager dashboards and enterprise org charts.

Supported hierarchy roles:

- Super Admin
- Admin
- Department Manager
- Team Leader
- Senior Employee
- Employee
- Intern

Projects support `projectManager`, `coLeaders`, `teamLeaders`, `department`, `members`, and `subTeams`. Tasks support assignment, delegation, review, approval, escalation, and workload fields.

## Real-Time Model

Socket rooms:

- `user:<userId>` for private notifications.
- `project:<projectId>` for Kanban, task, activity, and typing events.

Presence is tracked per connection count to avoid false offline events when a user has multiple tabs open.
