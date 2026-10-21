import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Page, PageHeader } from '../../components/ui'
import { toDisplayUser } from '../../lib/displayUser'
import { useAuth } from '../../providers/auth-context'
import { useToast } from '../../providers/toast'
import { workspaceApi } from '../../services/workspaceApi'
import type { AgentConversation, AgentMessage } from '../../types'
import { AgentHistory } from './AgentHistory'
import { AgentLayout } from './AgentPage.styles'
import { AgentTranscript } from './AgentTranscript'

function welcomeMessage(): AgentMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      'I can help with this Flowdesk workspace only. Ask me about tickets, customers, or the knowledge base. I can also prepare a ticket change for your approval.',
    createdAt: new Date().toISOString(),
  }
}

export function AgentPage() {
  const { user } = useAuth()
  const profile = user ? toDisplayUser(user) : null
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const activeConversation = useRef<string | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([welcomeMessage()])
  const [prompt, setPrompt] = useState('')
  const conversations = useQuery({
    queryKey: ['agent-conversations'],
    queryFn: () => workspaceApi.listAgentConversations(),
  })
  const mutation = useMutation({
    mutationFn: ({
      message,
      conversationId: id,
    }: {
      message: string
      conversationId: string | null
    }) => workspaceApi.runAgent(message, id),
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-usage'] })
      queryClient.setQueryData<AgentConversation[]>(['agent-conversations'], (current = []) => {
        const existing = current.find((item) => item.id === result.conversationId)
        const title = existing?.title ?? variables.message.trim().slice(0, 80)
        const next = {
          id: result.conversationId,
          title,
          updatedAt: new Date().toISOString(),
        }
        return [next, ...current.filter((item) => item.id !== result.conversationId)]
      })
      const stillOpen =
        activeConversation.current === variables.conversationId ||
        activeConversation.current === result.conversationId
      if (!stillOpen) return
      activeConversation.current = result.conversationId
      setConversationId(result.conversationId)
      setMessages((current) => [...current, result.message])
    },
    onError: () => {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'The agent could not complete that request. Try again.',
          createdAt: new Date().toISOString(),
        },
      ])
      notify('The agent could not complete that request', 'error')
    },
  })
  const decision = useMutation({
    mutationFn: ({ id, choice }: { id: string; choice: 'approve' | 'cancel' }) =>
      workspaceApi.decideAgentAction(id, choice),
    onSuccess: (tool) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['workspace-usage'] })
      setMessages((current) =>
        current.map((message) => ({
          ...message,
          toolCalls: message.toolCalls?.map((item) => (item.id === tool.id ? tool : item)),
        })),
      )
      notify(tool.status === 'completed' ? 'Action approved and applied' : 'Action cancelled')
    },
    onError: () => notify('The action was not applied', 'error'),
  })

  useEffect(() => {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('flowdesk.agent.transcript')) sessionStorage.removeItem(key)
    }
  }, [])

  const send = (value: string) => {
    const clean = value.trim()
    if (!clean || mutation.isPending) return
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: clean,
        createdAt: new Date().toISOString(),
      },
    ])
    setPrompt('')
    mutation.mutate({ message: clean, conversationId })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    send(prompt)
  }

  const openConversation = async (id: string) => {
    if (id === conversationId || mutation.isPending) return
    activeConversation.current = id
    setConversationId(id)
    setPrompt('')
    try {
      const stored = await workspaceApi.getAgentConversation(id)
      if (activeConversation.current !== id) return
      setMessages([welcomeMessage(), ...stored])
    } catch {
      notify('That conversation could not be opened', 'error')
    }
  }

  const startNew = () => {
    activeConversation.current = null
    setConversationId(null)
    setMessages([welcomeMessage()])
    setPrompt('')
  }

  return (
    <Page>
      <PageHeader
        title="AI Agent"
        description="Ask about tickets, customers, and the knowledge base. Questions outside this workspace get a short explanation of what the agent can do."
        actions={
          <Button icon={Plus} onClick={startNew} variant="secondary">
            New conversation
          </Button>
        }
      />

      <AgentLayout>
        <AgentHistory
          activeId={conversationId}
          conversations={conversations.data ?? []}
          onOpen={(id) => {
            void openConversation(id)
          }}
        />
        <AgentTranscript
          decisionPending={decision.isPending}
          isPending={mutation.isPending}
          messages={messages}
          onDecide={(id, choice) => decision.mutate({ id, choice })}
          onPromptChange={setPrompt}
          onSend={send}
          onSubmit={submit}
          profile={profile}
          prompt={prompt}
        />
      </AgentLayout>
    </Page>
  )
}
