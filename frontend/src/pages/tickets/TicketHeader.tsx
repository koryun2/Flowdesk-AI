import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  MoreHorizontal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, IconButton } from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Customer, Ticket } from '../../types'
import {
  Breadcrumbs,
  SourceLabel,
  TicketDetailActions,
  TicketDetailCopy,
  TicketDetailHeader,
  TicketIdRow,
} from './TicketDetailPage.styles'

export function TicketHeader({
  ticket,
  customer,
  onCopyId,
  onCopyLink,
  onToggleResolve,
}: {
  ticket: Ticket
  customer: Pick<Customer, 'id' | 'name'> | undefined
  onCopyId: () => void
  onCopyLink: () => void
  onToggleResolve: () => void
}) {
  return (
    <>
      <Breadcrumbs aria-label="Breadcrumb">
        <Link to="/tickets">
          <ArrowLeft size={15} /> Tickets
        </Link>
        <ChevronRight size={14} />
        <span>{ticket.key}</span>
      </Breadcrumbs>

      <TicketDetailHeader>
        <TicketDetailCopy>
          <TicketIdRow>
            <span>{ticket.key}</span>
            <button
              aria-label="Copy ticket ID"
              onClick={onCopyId}
              type="button"
            >
              <Copy size={13} />
            </button>
            <SourceLabel>{ticket.source}</SourceLabel>
          </TicketIdRow>
          <h1>{ticket.title}</h1>
          <p>
            Created {formatRelative(ticket.createdAt)} by{' '}
            <Link to={`/customers/${customer?.id}`}>{customer?.name}</Link>
          </p>
        </TicketDetailCopy>
        <TicketDetailActions>
          <IconButton label="More ticket actions" onClick={onCopyLink}>
            <MoreHorizontal size={19} />
          </IconButton>
          <Button
            icon={Check}
            onClick={onToggleResolve}
            variant={ticket.status === 'resolved' ? 'secondary' : 'primary'}
          >
            {ticket.status === 'resolved' ? 'Reopen ticket' : 'Resolve ticket'}
          </Button>
        </TicketDetailActions>
      </TicketDetailHeader>
    </>
  )
}
