import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ButtonLink,
  Page,
  PageLoader,
} from '../../components/ui'
import { useToast } from '../../providers/toast'
import { workspaceApi } from '../../services/workspaceApi'
import type { TicketPriority, TicketStatus } from '../../types'
import { TicketActivity } from './TicketActivity'
import { TicketAnalysis } from './TicketAnalysis'
import { TicketConversation } from './TicketConversation'
import { TicketCustomerCard } from './TicketCustomerCard'
import {
  DetailTab,
  DetailTabs,
  NotFoundCard,
  TicketDetailGrid,
  TicketDetailMain,
  TicketSidebar,
} from './TicketDetailPage.styles'
import { TicketHeader } from './TicketHeader'
import { TicketProperties } from './TicketProperties'

export function TicketDetailPage() {
  const { ticketId = '' } = useParams()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [activeTab, setActiveTab] = useState<'conversation' | 'activity'>(
    'conversation',
  )
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [tagName, setTagName] = useState('')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => workspaceApi.getTicket(ticketId),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['ticket-summary'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const updateMutation = useMutation({
    mutationFn: (update: {
      status?: TicketStatus
      priority?: TicketPriority
      assigneeId?: string | null
    }) => workspaceApi.updateTicket(ticketId, update),
    onSuccess: () => {
      refresh()
      notify('Ticket updated')
    },
    onError: () => notify('Unable to update ticket', 'error'),
  })

  const commentMutation = useMutation({
    mutationFn: () => workspaceApi.addComment(ticketId, reply, isInternal),
    onSuccess: () => {
      setReply('')
      refresh()
      notify(isInternal ? 'Internal note added' : 'Reply sent')
    },
    onError: () => notify('Unable to add comment', 'error'),
  })

  const analyzeMutation = useMutation({
    mutationFn: () => workspaceApi.analyzeTicket(ticketId),
    onSuccess: () => {
      refresh()
      notify('Ticket analysis updated')
    },
    onError: () => notify('Unable to analyze this ticket', 'error'),
  })

  const tagMutation = useMutation({
    mutationFn: (name: string) => workspaceApi.applySuggestedTag(data!.ticket, name),
    onSuccess: (_result, name) => {
      refresh()
      notify(`Added tag ${name}`)
    },
    onError: () => notify('Unable to add that tag', 'error'),
  })

  if (isLoading) return <PageLoader />
  if (isError || !data) {
    return (
      <NotFoundCard>
        <h2>Ticket not found</h2>
        <p>The ticket may have been removed or you may not have access.</p>
        <ButtonLink to="/tickets">Back to tickets</ButtonLink>
      </NotFoundCard>
    )
  }

  const { ticket, customer, users } = data

  return (
    <Page>
      <TicketHeader
        customer={customer}
        onCopyId={() => {
          navigator.clipboard.writeText(ticket.key)
          notify('Ticket ID copied')
        }}
        onCopyLink={() => {
          void navigator.clipboard.writeText(window.location.href)
          notify('Ticket link copied')
        }}
        onToggleResolve={() =>
          updateMutation.mutate({
            status:
              ticket.status === 'resolved' ? 'investigating' : 'resolved',
          })
        }
        ticket={ticket}
      />

      <TicketDetailGrid>
        <TicketDetailMain>
          <TicketConversation
            addingTag={addingTag}
            commentPending={commentMutation.isPending}
            customer={customer}
            isInternal={isInternal}
            onAddTagClick={() => setAddingTag(true)}
            onInternalChange={setIsInternal}
            onReplyChange={setReply}
            onSend={() => commentMutation.mutate()}
            onTagNameChange={setTagName}
            onTagSubmit={(name) => {
              tagMutation.mutate(name)
              setTagName('')
              setAddingTag(false)
            }}
            reply={reply}
            showThread={activeTab === 'conversation'}
            tagName={tagName}
            tabs={
              <DetailTabs>
                <DetailTab
                  $active={activeTab === 'conversation'}
                  onClick={() => setActiveTab('conversation')}
                  type="button"
                >
                  Conversation <span>{ticket.comments.length}</span>
                </DetailTab>
                <DetailTab
                  $active={activeTab === 'activity'}
                  onClick={() => setActiveTab('activity')}
                  type="button"
                >
                  Activity <span>{ticket.activity.length}</span>
                </DetailTab>
              </DetailTabs>
            }
            ticket={ticket}
          />

          {activeTab === 'activity' ? (
            <TicketActivity activity={ticket.activity} />
          ) : null}
        </TicketDetailMain>

        <TicketSidebar>
          <TicketProperties
            onAssigneeChange={(assigneeId) =>
              updateMutation.mutate({ assigneeId })
            }
            onPriorityChange={(priority) =>
              updateMutation.mutate({ priority })
            }
            onStatusChange={(status) => updateMutation.mutate({ status })}
            ticket={ticket}
            users={users}
          />

          <TicketAnalysis
            analyzePending={analyzeMutation.isPending}
            onApplyTag={(tag) => tagMutation.mutate(tag)}
            onRetryAnalyze={() => analyzeMutation.mutate()}
            tagPending={tagMutation.isPending}
            ticket={ticket}
          />

          <TicketCustomerCard customer={customer} />
        </TicketSidebar>
      </TicketDetailGrid>
    </Page>
  )
}
