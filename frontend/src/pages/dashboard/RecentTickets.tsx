import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Avatar,
  MutedCopy,
  PriorityBadge,
  SectionHeading,
  StatusBadge,
} from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Ticket } from '../../types'
import {
  CompactTicket,
  CompactTicketList,
  CompactTicketMain,
  CompactTicketMeta,
  RecentCard,
} from './DashboardPage.styles'

type RecentTicketsProps = {
  tickets: Ticket[]
}

export function RecentTickets({ tickets }: RecentTicketsProps) {
  const customerName = (ticket: Ticket) => ticket.customer?.name ?? 'Unknown'

  return (
    <RecentCard>
      <SectionHeading>
        <div>
          <h2>Recent tickets</h2>
          <p>Latest customer conversations</p>
        </div>
        <Link to="/tickets">
          View all <ArrowRight size={15} />
        </Link>
      </SectionHeading>
      <CompactTicketList>
        {tickets.length ? tickets.map((ticket) => (
          <CompactTicket
            key={ticket.id}
            to={`/tickets/${ticket.id}`}
          >
            <CompactTicketMain>
              <span>{ticket.key}</span>
              <strong>{ticket.title}</strong>
              <small>
                {customerName(ticket)} · {formatRelative(ticket.createdAt)}
              </small>
            </CompactTicketMain>
            <CompactTicketMeta>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              <Avatar size="xs" user={ticket.assignee} />
            </CompactTicketMeta>
          </CompactTicket>
        )) : (
          <MutedCopy>No tickets in this workspace yet.</MutedCopy>
        )}
      </CompactTicketList>
    </RecentCard>
  )
}
