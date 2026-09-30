import {
  CircleDot,
  ChevronRight,
  Database,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  TicketCheck,
  UserRound,
} from 'lucide-react'
import type { AgentConversation } from '../../types'
import {
  AgentHistory as HistoryPanel,
  AgentHistoryEmpty,
  AgentHistoryHeader,
  AgentHistoryItem,
  AgentHistoryList,
  AgentSafety,
  AgentTools,
} from './AgentPage.styles'

function conversationWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AgentHistory({
  conversations,
  activeId,
  onOpen,
}: {
  conversations: AgentConversation[]
  activeId: string | null
  onOpen: (id: string) => void
}) {
  return (
    <HistoryPanel>
      <AgentHistoryHeader>
        <span>Conversations</span>
      </AgentHistoryHeader>
      <AgentHistoryList>
        {conversations.length === 0 ? (
          <AgentHistoryEmpty>Your chats are saved here.</AgentHistoryEmpty>
        ) : (
          conversations.map((conversation) => (
            <AgentHistoryItem
              $active={conversation.id === activeId}
              key={conversation.id}
              onClick={() => onOpen(conversation.id)}
              type="button"
            >
              <span>
                <strong>{conversation.title}</strong>
                <small>{conversationWhen(conversation.updatedAt)}</small>
              </span>
              <ChevronRight size={14} />
            </AgentHistoryItem>
          ))
        )}
      </AgentHistoryList>
      <AgentSafety>
        <ShieldCheck size={18} />
        <div>
          <strong>Actions stay controlled</strong>
          <p>Database changes always require backend validation and your approval.</p>
        </div>
      </AgentSafety>
      <AgentTools>
        <span>Available tools</span>
        {[
          ['Search tickets', Search],
          ['Customer profiles', UserRound],
          ['Knowledge retrieval', Database],
          ['Create ticket', Plus],
          ['Ticket updates', TicketCheck],
          ['Ticket comments', MessageSquare],
        ].map(([label, Icon]) => {
          const ToolIcon = Icon as typeof Search
          return (
            <div key={label as string}>
              <ToolIcon size={14} /> {label as string}
              <CircleDot size={10} />
            </div>
          )
        })}
      </AgentTools>
    </HistoryPanel>
  )
}
