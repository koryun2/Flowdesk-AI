import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  KeyRound,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { FormField, FormGrid } from '../../components/fields'
import { Avatar, Button } from '../../components/ui'
import { useAuth } from '../../providers/auth-context'
import { ApiError, changePassword, updateProfile } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { SessionUser } from '../../services/authApi'
import type { User } from '../../types'
import {
  ConnectedBadge,
  ProfilePhotoRow,
  SecurityItem,
  SettingsForm,
  SettingsModelSelect,
  SettingsOption,
  SettingsOptionIcon,
  SettingsPanel as Panel,
  SettingsPanelFooter,
  SettingsPanelHeader,
  Switch,
} from './styles'

const roleLabels = {
  owner: 'Workspace owner',
  admin: 'Administrator',
  agent: 'Agent',
  viewer: 'Viewer',
} as const

type SettingsPanelProps = {
  active: string
  profile: User | null
  user: SessionUser | null | undefined
  notify: (message: string, type?: 'success' | 'error') => void
}

export function SettingsPanel({
  active,
  profile,
  user,
  notify,
}: SettingsPanelProps) {
  const membership = user?.memberships[0]
  const { setSession } = useAuth()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(profile?.name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC')
  const [workspaceName, setWorkspaceName] = useState(membership?.organization.name ?? '')
  const [workspaceSlug, setWorkspaceSlug] = useState(membership?.organization.slug ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const workspaceSettings = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: () => workspaceApi.getWorkspaceSettings(),
  })
  const [autoAnalyze, setAutoAnalyze] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [analysisModel, setAnalysisModel] = useState('gemma-4-26b-a4b-it')
  const saveSettings = useMutation({
    mutationFn: workspaceApi.saveWorkspaceSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(['workspace-settings'], saved)
      notify('AI configuration saved')
    },
    onError: () => notify('AI configuration was not saved', 'error'),
  })

  const saveProfile = useMutation({
    mutationFn: updateProfile,
    onSuccess: (saved) => {
      setSession(saved)
      notify('Profile saved')
    },
    onError: (error) => notify(errorText(error, 'Profile was not saved'), 'error'),
  })
  const saveWorkspace = useMutation({
    mutationFn: workspaceApi.saveWorkspaceProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(['workspace-settings'], saved)
      if (user) {
        setSession({
          ...user,
          memberships: user.memberships.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  organization: { ...item.organization, name: saved.name, slug: saved.slug },
                }
              : item,
          ),
        })
      }
      notify('Workspace settings saved')
    },
    onError: (error) => notify(errorText(error, 'Workspace settings were not saved'), 'error'),
  })
  const savePassword = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      notify('Password changed')
    },
    onError: (error) => notify(errorText(error, 'Password was not changed'), 'error'),
  })

  useEffect(() => {
    if (!workspaceSettings.data) return
    setAutoAnalyze(workspaceSettings.data.autoAnalyzeTickets)
    setRequireApproval(workspaceSettings.data.requireAgentApproval)
    setAnalysisModel(workspaceSettings.data.analysisModel)
    setWorkspaceName(workspaceSettings.data.name)
    setWorkspaceSlug(workspaceSettings.data.slug)
  }, [workspaceSettings.data])

  useEffect(() => {
    setFullName(profile?.name ?? '')
    setEmail(profile?.email ?? '')
    setTimezone(user?.timezone ?? 'UTC')
  }, [profile?.name, profile?.email, user?.timezone])

  if (active === 'profile') {
    return (
      <Panel>
        <SettingsPanelHeader>
          <div>
            <h2>Personal information</h2>
            <p>Update how you appear across the workspace.</p>
          </div>
        </SettingsPanelHeader>
        <ProfilePhotoRow>
          {profile ? <Avatar size="lg" user={profile} /> : null}
        </ProfilePhotoRow>
        <SettingsForm>
          <FormGrid>
            <FormField>
              <label htmlFor="settings-name">Full name</label>
              <input
                id="settings-name"
                onChange={(event) => setFullName(event.target.value)}
                value={fullName}
              />
            </FormField>
            <FormField>
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </FormField>
            <FormField>
              <label htmlFor="settings-role">Role</label>
              <input
                disabled
                id="settings-role"
                value={membership ? roleLabels[membership.role] : ''}
              />
            </FormField>
            <FormField>
              <label htmlFor="settings-timezone">Timezone</label>
              <select
                id="settings-timezone"
                onChange={(event) => setTimezone(event.target.value)}
                value={timezone}
              >
                <option value="UTC">UTC</option>
                <option value="Asia/Yerevan">Asia/Yerevan</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
              </select>
            </FormField>
          </FormGrid>
        </SettingsForm>
        <SettingsPanelFooter>
          <Button
            disabled={saveProfile.isPending}
            icon={Save}
            onClick={() => saveProfile.mutate({ name: fullName, email, timezone })}
          >
            Save changes
          </Button>
        </SettingsPanelFooter>
      </Panel>
    )
  }

  if (active === 'workspace') {
    return (
      <Panel>
        <SettingsPanelHeader>
          <div>
            <h2>Workspace settings</h2>
            <p>Configure the organization name and URL.</p>
          </div>
        </SettingsPanelHeader>
        <SettingsForm>
          <FormGrid>
            <FormField>
              <label htmlFor="workspace-name">Workspace name</label>
              <input
                id="workspace-name"
                onChange={(event) => setWorkspaceName(event.target.value)}
                value={workspaceName}
              />
            </FormField>
            <FormField>
              <label htmlFor="workspace-slug">Workspace URL</label>
              <input
                id="workspace-slug"
                onChange={(event) => setWorkspaceSlug(event.target.value)}
                value={workspaceSlug}
              />
            </FormField>
          </FormGrid>
        </SettingsForm>
        <SettingsPanelFooter>
          <Button
            disabled={saveWorkspace.isPending || membership?.role === 'agent' || membership?.role === 'viewer'}
            icon={Save}
            onClick={() => saveWorkspace.mutate({ name: workspaceName, slug: workspaceSlug })}
          >
            Save changes
          </Button>
        </SettingsPanelFooter>
      </Panel>
    )
  }

  if (active === 'ai') {
    return (
      <Panel>
        <SettingsPanelHeader>
          <div>
            <h2>AI configuration</h2>
            <p>Control analysis, the agent planner, and action safety.</p>
          </div>
          <ConnectedBadge>
            <i /> Service connected
          </ConnectedBadge>
        </SettingsPanelHeader>
        <SettingsOption>
          <SettingsOptionIcon>
            <Bot size={18} />
          </SettingsOptionIcon>
          <div>
            <strong>Automatic ticket analysis</strong>
            <p>Classify new tickets and suggest structured metadata.</p>
          </div>
          <Switch>
            <input
              checked={autoAnalyze}
              onChange={(event) => setAutoAnalyze(event.target.checked)}
              type="checkbox"
            />
            <span />
          </Switch>
        </SettingsOption>
        <SettingsOption>
          <SettingsOptionIcon>
            <ShieldCheck size={18} />
          </SettingsOptionIcon>
          <div>
            <strong>Require approval for agent writes</strong>
            <p>Every tool that mutates data must be confirmed by a user.</p>
          </div>
          <Switch>
            <input
              checked={requireApproval}
              onChange={(event) => setRequireApproval(event.target.checked)}
              type="checkbox"
            />
            <span />
          </Switch>
        </SettingsOption>
        <SettingsModelSelect>
          <FormField>
            <label htmlFor="ai-model">Default model</label>
            <select
              id="ai-model"
              onChange={(event) => setAnalysisModel(event.target.value)}
              value={analysisModel}
            >
              <option value="gemma-4-26b-a4b-it">Gemma 4 26B · Smaller model</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash · Higher quality</option>
            </select>
          </FormField>
        </SettingsModelSelect>
        <SettingsPanelFooter>
          <Button
            disabled={saveSettings.isPending}
            icon={Save}
            onClick={() =>
              saveSettings.mutate({
                autoAnalyzeTickets: autoAnalyze,
                requireAgentApproval: requireApproval,
                analysisModel,
              })
            }
          >
            Save configuration
          </Button>
        </SettingsPanelFooter>
      </Panel>
    )
  }

  if (active === 'security') {
    return (
      <Panel>
        <SettingsPanelHeader>
          <div>
            <h2>Security</h2>
            <p>Change the password you use to sign in.</p>
          </div>
        </SettingsPanelHeader>
        <SecurityItem>
          <span>
            <KeyRound size={18} />
          </span>
          <div>
            <strong>Password</strong>
            <p>Use your current password to choose a new one.</p>
          </div>
        </SecurityItem>
        <SettingsForm>
          <FormGrid>
            <FormField>
              <label htmlFor="current-password">Current password</label>
              <input
                autoComplete="current-password"
                id="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </FormField>
            <FormField>
              <label htmlFor="new-password">New password</label>
              <input
                autoComplete="new-password"
                id="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </FormField>
          </FormGrid>
        </SettingsForm>
        <SettingsPanelFooter>
          <Button
            disabled={savePassword.isPending || !currentPassword || !newPassword}
            icon={Save}
            onClick={() => savePassword.mutate({ currentPassword, newPassword })}
          >
            Change password
          </Button>
        </SettingsPanelFooter>
      </Panel>
    )
  }

  return null
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return Object.values(error.fieldErrors)[0] || error.message
  }
  return fallback
}
