import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { FormField, FormGrid } from '../../components/fields'
import { Avatar, Button } from '../../components/ui'
import { mockApi } from '../../services/mockApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { SessionUser } from '../../services/authApi'
import type { User } from '../../types'
import {
  ConnectedBadge,
  IntegrationRow,
  ProfilePhotoRow,
  SecurityItem,
  SettingsCallout,
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
  const queryClient = useQueryClient()
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

  useEffect(() => {
    if (!workspaceSettings.data) return
    setAutoAnalyze(workspaceSettings.data.autoAnalyzeTickets)
    setRequireApproval(workspaceSettings.data.requireAgentApproval)
    setAnalysisModel(workspaceSettings.data.analysisModel)
  }, [workspaceSettings.data])

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
          <div>
            <Button
              onClick={() => notify('Photo upload is not available in this workspace')}
              size="sm"
              variant="secondary"
            >
              Change photo
            </Button>
            <p>JPG, PNG or WebP. Max 2 MB.</p>
          </div>
        </ProfilePhotoRow>
        <SettingsForm>
          <FormGrid>
            <FormField>
              <label htmlFor="settings-name">Full name</label>
              <input defaultValue={profile?.name ?? ''} id="settings-name" />
            </FormField>
            <FormField>
              <label htmlFor="settings-email">Email</label>
              <input defaultValue={profile?.email ?? ''} id="settings-email" />
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
              <select defaultValue={user?.timezone ?? 'UTC'} id="settings-timezone">
                <option value="UTC">UTC</option>
                <option value="Asia/Yerevan">Asia/Yerevan</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
              </select>
            </FormField>
          </FormGrid>
        </SettingsForm>
        <SettingsPanelFooter>
          <Button
            icon={Save}
            onClick={() => notify('Profile settings saved')}
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
            <p>Configure organization defaults and demo data.</p>
          </div>
        </SettingsPanelHeader>
        <SettingsForm>
          <FormGrid>
            <FormField>
              <label htmlFor="workspace-name">Workspace name</label>
              <input defaultValue={membership?.organization.name ?? ''} id="workspace-name" />
            </FormField>
            <FormField>
              <label htmlFor="workspace-slug">Workspace URL</label>
              <input defaultValue={membership?.organization.slug ?? ''} id="workspace-slug" />
            </FormField>
          </FormGrid>
        </SettingsForm>
        <SettingsCallout>
          <RefreshCw size={18} />
          <div>
            <strong>Reset local agent demo</strong>
            <p>Restore the sample agent conversation stored in this browser. Knowledge sources stay in the workspace.</p>
          </div>
          <Button
            onClick={() => {
              mockApi.resetDemo()
              notify('Demo workspace reset')
            }}
            size="sm"
            variant="secondary"
          >
            Reset data
          </Button>
        </SettingsCallout>
        <SettingsPanelFooter>
          <Button
            icon={Save}
            onClick={() => notify('Workspace settings saved')}
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
            <p>Control analysis behavior and action safety.</p>
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
            <label htmlFor="ai-model">Default analysis model</label>
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

  if (active === 'integrations') {
    return (
      <Panel>
        <SettingsPanelHeader>
          <div>
            <h2>Integrations</h2>
            <p>Connect Flowdesk with your product stack.</p>
          </div>
        </SettingsPanelHeader>
        {[
          ['Slack', 'Route urgent tickets and agent updates', 'S', true],
          ['Linear', 'Create engineering issues from tickets', 'L', false],
          ['Gemini', 'Structured analysis and embeddings', 'G', true],
          ['Segment', 'Enrich customer activity context', 'SG', false],
        ].map(([name, detail, mark, connected]) => (
          <IntegrationRow key={name as string}>
            <span>{mark as string}</span>
            <div>
              <strong>{name as string}</strong>
              <p>{detail as string}</p>
            </div>
            <Button
              onClick={() =>
                notify(
                  connected
                    ? `${name} is shown as connected for this demo`
                    : `${name} is not connected in this workspace`,
                )
              }
              size="sm"
              variant={connected ? 'secondary' : 'primary'}
            >
              {connected ? 'Manage' : 'Connect'}
            </Button>
          </IntegrationRow>
        ))}
      </Panel>
    )
  }

  if (active === 'security') {
    return (
      <Panel>
        <SettingsPanelHeader>
          <div>
            <h2>Security</h2>
            <p>Authentication and workspace access controls.</p>
          </div>
        </SettingsPanelHeader>
        <SecurityItem>
          <span>
            <KeyRound size={18} />
          </span>
          <div>
            <strong>Password</strong>
            <p>Use your current password to sign in.</p>
          </div>
          <Button
            onClick={() => notify('Password changes are not available in this workspace')}
            size="sm"
            variant="secondary"
          >
            Change password
          </Button>
        </SecurityItem>
        <SecurityItem>
          <span>
            <LockKeyhole size={18} />
          </span>
          <div>
            <strong>Two-factor authentication</strong>
            <p>Add another layer of account protection</p>
          </div>
          <Button
            onClick={() => notify('Two-factor authentication is not available in this workspace')}
            size="sm"
          >
            Enable 2FA
          </Button>
        </SecurityItem>
      </Panel>
    )
  }

  return null
}
