import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  LayoutDashboard,
  Settings,
  Sparkles,
  TicketCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useMatch, useResolvedPath } from 'react-router-dom'
import type { Membership } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import {
  Brand,
  BrandMark,
  BrandText,
  CollapseButton,
  MobileCloseButton,
  NavItem,
  NavItemAnchor,
  NavItemSpark,
  SectionLabel,
  Sidebar as SidebarPanel,
  SidebarBrand,
  SidebarFooter,
  SidebarNav,
  UsageCard,
  UsageCardHeader,
  UsageCardHint,
  WorkspaceMenu,
  WorkspaceOption,
  WorkspaceOptionIcon,
  WorkspaceSwitcher,
  WorkspaceSwitcherCopy,
  WorkspaceSwitcherIcon,
  WorkspaceSwitcherWrap,
} from './styles'

const navigation: {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  accent?: boolean
}[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Tickets', to: '/tickets', icon: TicketCheck },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Knowledge', to: '/knowledge', icon: BookOpen },
  { label: 'AI Agent', to: '/agent', icon: Bot, accent: true },
]

function ShellNavLink({
  to,
  end,
  collapsed,
  accent,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string
  end?: boolean
  collapsed: boolean
  accent?: boolean
  label: string
  icon: LucideIcon
  onNavigate: () => void
}) {
  const resolved = useResolvedPath(to)
  const match = useMatch({ path: resolved.pathname, end: end ?? false })

  return (
    <NavItem
      $active={match != null}
      $collapsed={collapsed}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      to={to}
    >
      <Icon size={18} />
      <span>{label}</span>
      {accent ? <NavItemSpark>AI</NavItemSpark> : null}
    </NavItem>
  )
}

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  memberships: Membership[]
  onCloseMobile: () => void
  onToggleCollapsed: () => void
}

export function Sidebar({
  collapsed,
  mobileOpen,
  memberships,
  onCloseMobile,
  onToggleCollapsed,
}: SidebarProps) {
  const usage = useQuery({
    queryKey: ['workspace-usage'],
    queryFn: () => workspaceApi.getWorkspaceUsage(),
  })
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const settingsResolved = useResolvedPath('/settings')
  const settingsMatch = useMatch({ path: settingsResolved.pathname, end: false })
  const workspace = memberships[0]?.organization
  const workspaceName = workspace?.name ?? 'Workspace'
  const workspaceInitial = workspaceName[0]?.toUpperCase() ?? 'F'

  return (
    <SidebarPanel $collapsed={collapsed} $open={mobileOpen}>
      <SidebarBrand $collapsed={collapsed}>
        <Brand aria-label="Flowdesk dashboard" to="/">
          <BrandMark>
            <Sparkles size={18} />
          </BrandMark>
          <BrandText $collapsed={collapsed}>
            Flowdesk <strong>AI</strong>
          </BrandText>
        </Brand>
        <MobileCloseButton label="Close menu" onClick={onCloseMobile}>
          <X size={18} />
        </MobileCloseButton>
      </SidebarBrand>

      <WorkspaceSwitcherWrap>
        <WorkspaceSwitcher
          $collapsed={collapsed}
          aria-expanded={workspaceOpen}
          onClick={() => setWorkspaceOpen((open) => !open)}
          type="button"
        >
          <WorkspaceSwitcherIcon>{workspaceInitial}</WorkspaceSwitcherIcon>
          <WorkspaceSwitcherCopy $collapsed={collapsed}>
            <small>Workspace</small>
            <strong>{workspaceName}</strong>
          </WorkspaceSwitcherCopy>
          <ChevronDown size={15} />
        </WorkspaceSwitcher>
        {workspaceOpen ? (
          <WorkspaceMenu>
            {memberships.map((membership) => (
              <WorkspaceOption $active key={membership.id} type="button">
                <WorkspaceOptionIcon>
                  {membership.organization.name[0]?.toUpperCase()}
                </WorkspaceOptionIcon>
                <div>
                  <strong>{membership.organization.name}</strong>
                  <small>{membership.role}</small>
                </div>
              </WorkspaceOption>
            ))}
          </WorkspaceMenu>
        ) : null}
      </WorkspaceSwitcherWrap>

      <SidebarNav aria-label="Primary navigation">
        <SectionLabel $collapsed={collapsed}>Workspace</SectionLabel>
        {navigation.map(({ label, to, icon, end, accent }) => (
          <ShellNavLink
            accent={accent}
            collapsed={collapsed}
            end={end}
            icon={icon}
            key={to}
            label={label}
            onNavigate={onCloseMobile}
            to={to}
          />
        ))}

        <SectionLabel $collapsed={collapsed} $second>
          Manage
        </SectionLabel>
        <NavItem
          $active={settingsMatch != null}
          $collapsed={collapsed}
          to="/settings"
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavItem>
        <NavItemAnchor $collapsed={collapsed} href="mailto:support@flowdesk.ai">
          <CircleHelp size={18} />
          <span>Help center</span>
        </NavItemAnchor>
      </SidebarNav>

      <SidebarFooter>
        <UsageCard $collapsed={collapsed}>
          <UsageCardHeader>
            <span>AI actions</span>
            <strong>{usage.data?.actionsThisMonth ?? 0}</strong>
          </UsageCardHeader>
          <UsageCardHint>This month</UsageCardHint>
        </UsageCard>
        <CollapseButton
          $collapsed={collapsed}
          onClick={onToggleCollapsed}
          type="button"
        >
          {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          <span>Collapse sidebar</span>
        </CollapseButton>
      </SidebarFooter>
    </SidebarPanel>
  )
}
