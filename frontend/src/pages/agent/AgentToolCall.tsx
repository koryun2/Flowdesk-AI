import {
  Check,
  Clock3,
  Database,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  TicketCheck,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui'
import { TicketText } from './TicketText'
import type { AgentToolCall as AgentToolCallData } from '../../types'
import {
  ToolApproval,
  ToolCall,
  ToolCallIcon,
  ToolCallMain,
} from './AgentPage.styles'

const toolIcons: Record<string, typeof Search> = {
  search_tickets: Search,
  get_customer: UserRound,
  search_knowledge_base: Database,
  create_ticket: Plus,
  update_ticket: TicketCheck,
  add_ticket_comment: MessageSquare,
}

type AgentToolCallProps = {
  tool: AgentToolCallData
  decisionPending: boolean
  onDecide: (id: string, choice: 'approve' | 'cancel') => void
}

export function AgentToolCall({
  tool,
  decisionPending,
  onDecide,
}: AgentToolCallProps) {
  const ToolIcon = toolIcons[tool.name] ?? Wrench

  return (
    <ToolCall $status={tool.status}>
      <ToolCallIcon>
        <ToolIcon size={16} />
      </ToolCallIcon>
      <ToolCallMain $status={tool.status}>
        <header>
          <strong>{tool.name}</strong>
          <span>
            {tool.status === 'completed' ? (
              <>
                <Check size={12} /> Completed
              </>
            ) : tool.status === 'cancelled' ? (
              <>
                <X size={12} /> Cancelled
              </>
            ) : tool.status === 'approval_required' ? (
              <>
                <ShieldCheck size={12} /> Approval required
              </>
            ) : (
              <>
                <Clock3 size={12} /> Running
              </>
            )}
          </span>
        </header>
        <code>{tool.input}</code>
        {tool.result ? (
          <p>
            <TicketText text={tool.result} />
          </p>
        ) : null}
        {tool.status === 'approval_required' ? (
          <ToolApproval>
            <p>
              This action changes application data. The backend
              will validate your permissions and the ticket state.
            </p>
            <Button
              disabled={decisionPending}
              icon={Check}
              onClick={() => onDecide(tool.id, 'approve')}
              size="sm"
            >
              Approve action
            </Button>
            <Button
              disabled={decisionPending}
              icon={X}
              onClick={() => onDecide(tool.id, 'cancel')}
              size="sm"
              variant="secondary"
            >
              Cancel
            </Button>
          </ToolApproval>
        ) : null}
      </ToolCallMain>
    </ToolCall>
  )
}
