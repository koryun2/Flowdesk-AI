import { Plus, TicketCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  InlineEmpty,
  PriorityBadge,
  SectionHeading,
  StatusBadge,
} from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Customer, Ticket } from '../../types'
import {
  TicketHistoryCard,
  TicketList,
  TicketRow,
} from './CustomerDetailPage.styles'

type CustomerTicketsProps = {
  customer: Customer
  tickets: Ticket[]
}

export function CustomerTickets({ customer, tickets }: CustomerTicketsProps) {
  return (
    <TicketHistoryCard>
      <SectionHeading>
        <div>
          <h2>Ticket history</h2>
          <p>Recent conversations with {customer.name}</p>
        </div>
        <Link to="/tickets">
          <Plus size={14} /> New ticket
        </Link>
      </SectionHeading>
      {tickets.length ? (
        <TicketList>
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} to={`/tickets/${ticket.id}`}>
              <div>
                <span>{ticket.key}</span>
                <strong>{ticket.title}</strong>
                <small>{formatRelative(ticket.createdAt)}</small>
              </div>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </TicketRow>
          ))}
        </TicketList>
      ) : (
        <InlineEmpty>
          <TicketCheck size={22} />
          <strong>No tickets yet</strong>
          <span>This customer has a clean support history.</span>
        </InlineEmpty>
      )}
    </TicketHistoryCard>
  )
}
