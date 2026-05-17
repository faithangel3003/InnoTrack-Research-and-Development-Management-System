import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { RoleRoute } from './RoleRoute'
import { ProtectedRoute } from './ProtectedRoute'
import { RouteErrorBoundary } from '../components/RouteErrorBoundary'
import { useAuth } from '../hooks/useAuth'
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout'
import { Spinner } from '../components/ui/Spinner'

const LandingPage = lazy(() => import('../pages/public/LandingPage').then((module) => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })))
const SignUpPage = lazy(() => import('../pages/auth/SignUpPage').then((module) => ({ default: module.SignUpPage })))
const SignUpCheckoutPage = lazy(() => import('../pages/auth/SignUpCheckoutPage').then((module) => ({ default: module.SignUpCheckoutPage })))
const SignUpCompletePage = lazy(() => import('../pages/auth/SignUpCompletePage').then((module) => ({ default: module.SignUpCompletePage })))
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const UsersPage = lazy(() => import('../pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })))
const CreateUserPage = lazy(() => import('../pages/admin/CreateUserPage').then((module) => ({ default: module.CreateUserPage })))
const EditUserPage = lazy(() => import('../pages/admin/EditUserPage').then((module) => ({ default: module.EditUserPage })))
const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage').then((module) => ({ default: module.AuditLogPage })))
const ResearchDocumentationPage = lazy(() => import('../pages/admin/ResearchDocumentationPage').then((module) => ({ default: module.ResearchDocumentationPage })))
const CollaborationPage = lazy(() => import('../pages/admin/CollaborationPage').then((module) => ({ default: module.CollaborationPage })))
const InnovationAnalyticsPage = lazy(() => import('../pages/admin/InnovationAnalyticsPage').then((module) => ({ default: module.InnovationAnalyticsPage })))
const ProjectsPage = lazy(() => import('../pages/admin/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const TasksPage = lazy(() => import('../pages/admin/TasksPage').then((module) => ({ default: module.TasksPage })))
const CalendarPage = lazy(() => import('../pages/admin/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const AdminReportsPage = lazy(() => import('../pages/admin/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SubscriptionPage = lazy(() => import('../pages/admin/SubscriptionPage').then((module) => ({ default: module.SubscriptionPage })))
const AdminSettingsPage = lazy(() => import('../pages/admin/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const MyTasksPage = lazy(() => import('../pages/admin/MyTasksPage').then((module) => ({ default: module.MyTasksPage })))
const TeamMemberDashboardPage = lazy(() => import('../pages/admin/TeamMemberDashboardPage').then((module) => ({ default: module.TeamMemberDashboardPage })))
const SuperAdminDashboardPage = lazy(() => import('../pages/superadmin/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const CompaniesPage = lazy(() => import('../pages/superadmin/CompaniesPage').then((module) => ({ default: module.CompaniesPage })))
const SubscriptionsPage = lazy(() => import('../pages/superadmin/SubscriptionsPage').then((module) => ({ default: module.SubscriptionsPage })))
const PaymentsPage = lazy(() => import('../pages/superadmin/PaymentsPage').then((module) => ({ default: module.PaymentsPage })))
const SuperAdminReportsPage = lazy(() => import('../pages/superadmin/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SuperAdminSettingsPage = lazy(() => import('../pages/superadmin/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function SuspendedRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RouteLoader />}>
      {children}
    </Suspense>
  )
}

function RouteLoader() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <Spinner />
    </div>
  )
}

function AdminDashboardEntry() {
  const { user } = useAuth()

  if (user?.role === 'SuperAdmin') {
    return (
      <SuperAdminLayout>
        <RouteErrorBoundary><SuspendedRoute><SuperAdminDashboardPage /></SuspendedRoute></RouteErrorBoundary>
      </SuperAdminLayout>
    )
  }

  if (user?.role === 'TeamMember') {
    return (
      <AppLayout>
        <RouteErrorBoundary><SuspendedRoute><TeamMemberDashboardPage /></SuspendedRoute></RouteErrorBoundary>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <RouteErrorBoundary><SuspendedRoute><DashboardPage /></SuspendedRoute></RouteErrorBoundary>
    </AppLayout>
  )
}

function ReportsEntry() {
  const { user } = useAuth()

  if (user?.role === 'SuperAdmin') {
    return (
      <SuperAdminLayout>
        <RouteErrorBoundary><SuspendedRoute><SuperAdminReportsPage /></SuspendedRoute></RouteErrorBoundary>
      </SuperAdminLayout>
    )
  }

  return (
    <AppLayout>
      <RouteErrorBoundary><SuspendedRoute><AdminReportsPage /></SuspendedRoute></RouteErrorBoundary>
    </AppLayout>
  )
}

function SettingsEntry() {
  const { user } = useAuth()

  if (user?.role === 'SuperAdmin') {
    return (
      <SuperAdminLayout>
        <RouteErrorBoundary><SuspendedRoute><SuperAdminSettingsPage /></SuspendedRoute></RouteErrorBoundary>
      </SuperAdminLayout>
    )
  }

  return (
    <AppLayout>
      <RouteErrorBoundary><SuspendedRoute><AdminSettingsPage /></SuspendedRoute></RouteErrorBoundary>
    </AppLayout>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<SuspendedRoute><LandingPage /></SuspendedRoute>} />
      <Route path="/login" element={<SuspendedRoute><LoginPage /></SuspendedRoute>} />
      <Route path="/auth/forgot-password" element={<SuspendedRoute><ForgotPasswordPage /></SuspendedRoute>} />
      <Route
        path="/auth/change-password"
        element={
          <ProtectedRoute>
            <SuspendedRoute><ChangePasswordPage /></SuspendedRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/signup" element={<SuspendedRoute><SignUpPage /></SuspendedRoute>} />
      <Route path="/signup/checkout" element={<SuspendedRoute><SignUpCheckoutPage /></SuspendedRoute>} />
      <Route path="/signup/complete" element={<SuspendedRoute><SignUpCompletePage /></SuspendedRoute>} />

      <Route
        path="/admin/dashboard"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin', 'ProjectManager', 'TeamMember']}>
            <AdminDashboardEntry />
          </RoleRoute>
        }
      />

      <Route
        path="/admin/companies"
        element={
          <RoleRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminLayout>
              <RouteErrorBoundary><SuspendedRoute><CompaniesPage /></SuspendedRoute></RouteErrorBoundary>
            </SuperAdminLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/subscriptions"
        element={
          <RoleRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminLayout>
              <RouteErrorBoundary><SuspendedRoute><SubscriptionsPage /></SuspendedRoute></RouteErrorBoundary>
            </SuperAdminLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <RoleRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminLayout>
              <RouteErrorBoundary><SuspendedRoute><PaymentsPage /></SuspendedRoute></RouteErrorBoundary>
            </SuperAdminLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin']}>
            <ReportsEntry />
          </RoleRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin', 'ProjectManager', 'TeamMember']}>
            <SettingsEntry />
          </RoleRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><UsersPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/users/create"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><CreateUserPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/users/:id/edit"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><EditUserPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/audit-logs"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><AuditLogPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/research-documentation"
        element={
          <RoleRoute allowedRoles={['SuperAdmin', 'SystemAdmin', 'ProjectManager', 'TeamMember']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><ResearchDocumentationPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/collaboration"
        element={
          <RoleRoute allowedRoles={['SystemAdmin', 'ProjectManager', 'TeamMember']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><CollaborationPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/innovation-analytics"
        element={
          <RoleRoute allowedRoles={['SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><InnovationAnalyticsPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/projects"
        element={
          <RoleRoute allowedRoles={['SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><ProjectsPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/tasks"
        element={
          <RoleRoute allowedRoles={['SystemAdmin', 'ProjectManager']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><TasksPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/calendar"
        element={
          <RoleRoute allowedRoles={['SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><CalendarPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/admin/subscription"
        element={
          <RoleRoute allowedRoles={['SystemAdmin']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><SubscriptionPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <RoleRoute allowedRoles={['ProjectManager']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><ProjectsPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/my-tasks"
        element={
          <RoleRoute allowedRoles={['TeamMember']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><MyTasksPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <RoleRoute allowedRoles={['SystemAdmin', 'ProjectManager', 'TeamMember']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><ResearchDocumentationPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route
        path="/collaboration"
        element={
          <RoleRoute allowedRoles={['SystemAdmin', 'ProjectManager', 'TeamMember']}>
            <AppLayout>
              <RouteErrorBoundary><SuspendedRoute><CollaborationPage /></SuspendedRoute></RouteErrorBoundary>
            </AppLayout>
          </RoleRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
