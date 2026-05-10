# API Documentation

Base URLs:

- Current: `/api/v1`
- Backward-compatible legacy: `/api`

All protected endpoints require an access token in `Authorization: Bearer <token>` or the secure `access_token` cookie. Mutating cookie-authenticated requests must include `X-CSRF-Token` matching the `csrf_token` cookie.

## Auth

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/signup` | Register user, create session, issue access/refresh cookies |
| POST | `/auth/login` | Login with token rotation/session persistence |
| POST | `/auth/refresh` | Rotate refresh token and issue a fresh access token |
| POST | `/auth/logout` | Revoke current session and clear cookies |
| GET | `/auth/me` | Load current user |
| GET | `/auth/csrf` | Get current CSRF token |
| POST | `/auth/forgot-password` | Generate password reset token |
| POST | `/auth/reset-password` | Reset password and revoke sessions |
| POST | `/auth/verify-email` | Verify email token |

## Collaboration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET/POST | `/workspaces` | List/create workspaces |
| GET/PATCH | `/workspaces/:id` | Read/update workspace settings |
| POST | `/workspaces/:id/invites` | Invite a workspace member |
| GET/POST | `/projects` | List/create projects |
| GET/PATCH/DELETE | `/projects/:id` | Read/update/delete a project |
| POST | `/projects/:id/members` | Add a project member |
| DELETE | `/projects/:id/members/:userId` | Remove a project member |

## Organization Hierarchy

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/organization/tree` | Recursive company reporting tree |
| GET | `/organization/dashboard` | Hierarchy-level employee, department, workload, and approval metrics |
| GET/POST | `/organization/departments` | List/create departments |
| GET | `/organization/subordinates/:managerId?` | Recursive subordinate list |
| GET | `/organization/reporting-chain/:userId?` | Upward reporting chain |
| PATCH | `/organization/assign-manager` | Move an employee under another manager |
| PATCH | `/organization/employees/:employeeId` | Update hierarchy role/designation/department metadata |

## Tasks

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET/POST | `/tasks` | List/create tasks with pagination, filtering, sorting |
| GET/PATCH/DELETE | `/tasks/:id` | Read/update/delete a task |
| PATCH | `/tasks/reorder` | Persist Kanban ordering and status movement |
| POST | `/tasks/:id/attachments` | Upload an attachment |
| GET/POST | `/comments/task/:taskId` | List/create task comments |

## Enterprise Utility

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/analytics/dashboard` | Dashboard aggregations |
| GET | `/activity` | Audit timeline |
| GET | `/search` | Global task/project/user search |
| GET/POST | `/search/filters` | List/save filters |
| GET/PATCH | `/notifications` | Notification center |

## Query Patterns

Task, project, notification, and comment list endpoints support pagination. List responses use:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 25,
  "pages": 1
}
```

Task and project list endpoints also support:

- `page`
- `limit`
- `sort`, for example `-updatedAt` or `dueDate`
- `search`
- task filters: `status`, `priority`, `assignee`, `project`, `due=overdue`, `tags`

Notification list filters:

- `read=true`
- `read=false`
- `type=TASK_ASSIGNED`

Comment lists are scoped to a task:

- `GET /api/v1/comments/task/:taskId?page=1&limit=25`
