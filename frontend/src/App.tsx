import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { PageLoader } from './components/ui'
import { useAuth } from './providers/auth-context'

const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const TicketsPage = lazy(() =>
  import('./pages/tickets/TicketsPage').then((module) => ({
    default: module.TicketsPage,
  })),
)
const TicketDetailPage = lazy(() =>
  import('./pages/tickets/TicketDetailPage').then((module) => ({
    default: module.TicketDetailPage,
  })),
)
const CustomersPage = lazy(() =>
  import('./pages/customers/CustomersPage').then((module) => ({
    default: module.CustomersPage,
  })),
)
const CustomerDetailPage = lazy(() =>
  import('./pages/customers/CustomerDetailPage').then((module) => ({
    default: module.CustomerDetailPage,
  })),
)
const KnowledgePage = lazy(() =>
  import('./pages/knowledge/KnowledgePage').then((module) => ({
    default: module.KnowledgePage,
  })),
)
const AgentPage = lazy(() =>
  import('./pages/agent/AgentPage').then((module) => ({
    default: module.AgentPage,
  })),
)
const AuthPage = lazy(() =>
  import('./pages/auth/AuthPage').then((module) => ({
    default: module.AuthPage,
  })),
)
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const NotificationsPage = lazy(() =>
  import('./pages/notifications/NotificationsPage').then((module) => ({
    default: module.NotificationsPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('./pages/not-found/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (status === 'anonymous') return <Navigate replace to="/login" />
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (status === 'authenticated') return <Navigate replace to="/" />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} path="/login" />
          <Route element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} path="/register" />
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route element={<DashboardPage />} index />
            <Route element={<TicketsPage />} path="tickets" />
            <Route element={<TicketDetailPage />} path="tickets/:ticketId" />
            <Route element={<CustomersPage />} path="customers" />
            <Route element={<CustomerDetailPage />} path="customers/:customerId" />
            <Route element={<KnowledgePage />} path="knowledge" />
            <Route element={<AgentPage />} path="agent" />
            <Route element={<SettingsPage />} path="settings" />
            <Route element={<NotificationsPage />} path="notifications" />
            <Route element={<NotFoundPage />} path="*" />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
