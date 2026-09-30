import {
  Link2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Page, PageHeader } from '../../components/ui'
import { toDisplayUser } from '../../lib/displayUser'
import { useAuth } from '../../providers/auth-context'
import { useToast } from '../../providers/toast'
import { SettingsNav } from './SettingsNav'
import { SettingsPanel } from './SettingsPanel'
import { SettingsContent, SettingsLayout } from './styles'

const settingTabs = [
  { id: 'profile', label: 'My profile', icon: UserRound },
  { id: 'workspace', label: 'Workspace', icon: Users },
  { id: 'ai', label: 'AI configuration', icon: Sparkles },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'security', label: 'Security', icon: ShieldCheck },
]

export function SettingsPage() {
  const { user } = useAuth()
  const [active, setActive] = useState('profile')
  const { notify } = useToast()
  const profile = user ? toDisplayUser(user) : null

  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Manage your profile, workspace, AI behavior, and integrations."
      />
      <SettingsLayout>
        <SettingsNav active={active} onChange={setActive} tabs={settingTabs} />
        <SettingsContent>
          <SettingsPanel
            active={active}
            notify={notify}
            profile={profile}
            user={user}
          />
        </SettingsContent>
      </SettingsLayout>
    </Page>
  )
}
