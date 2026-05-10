import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { AuditLogPage } from './pages/AuditLogPage.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DepartmentDetailPage } from './pages/DepartmentDetailPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { EmployeesPage } from './pages/EmployeesPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { EmployeeProfilePage } from './pages/EmployeeProfilePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { OrganizationPage } from './pages/OrganizationPage.jsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.jsx';
import { ProjectsPage } from './pages/ProjectsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { SignupPage } from './pages/SignupPage.jsx';
import { TasksPage } from './pages/TasksPage.jsx';
import { TeamDetailPage } from './pages/TeamDetailPage.jsx';
import { TeamEditPage } from './pages/TeamEditPage.jsx';
import { TeamsPage } from './pages/TeamsPage.jsx';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'departments/:id', element: <DepartmentDetailPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:id', element: <TeamDetailPage /> },
      { path: 'teams/:id/edit', element: <TeamEditPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/:id', element: <EmployeeProfilePage /> },
      { path: 'organization', element: <OrganizationPage /> },
      { path: 'organization/departments/:id', element: <DepartmentDetailPage /> },
      { path: 'organization/teams/:id', element: <TeamDetailPage /> },
      { path: 'team', element: <Navigate to="/employees" replace /> },
      { path: 'team/:id', element: <EmployeeProfilePage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'audit', element: <AuditLogPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
]);
