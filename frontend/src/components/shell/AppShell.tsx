import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { toDisplayUser } from '../../lib/displayUser'
import { useAuth } from '../../providers/auth-context'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Main, MobileOverlay, PageContainer, Shell } from './styles'

export function AppShell() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const profile = user ? toDisplayUser(user) : null

  if (!user || !profile) return null

  return (
    <Shell>
      {mobileOpen ? (
        <MobileOverlay
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <Sidebar
        collapsed={collapsed}
        memberships={user.memberships}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />

      <Main $collapsed={collapsed}>
        <Topbar onOpenMobile={() => setMobileOpen(true)} profile={profile} />

        <PageContainer>
          <Outlet />
        </PageContainer>
      </Main>
    </Shell>
  )
}
