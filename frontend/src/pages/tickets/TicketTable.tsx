import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  PriorityBadge,
  Skeleton,
  StatusBadge,
} from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Ticket } from '../../types'
import {
  AssigneeCell,
  CheckboxCell,
  CheckboxDataCell,
  CustomerCell,
  DataTable,
  MutedCell,
  TablePagination,
  TableScroll,
  TableSkeleton,
  TicketTitleCell,
} from './TicketsPage.styles'

export function TicketTable({
  tickets,
  selected,
  isLoading,
  isError,
  total,
  pageSize,
  safePage,
  totalPages,
  onRetry,
  onToggleAll,
  onToggleTicket,
  onPageChange,
  onCreateTicket,
}: {
  tickets: Ticket[]
  selected: string[]
  isLoading: boolean
  isError: boolean
  total: number
  pageSize: number
  safePage: number
  totalPages: number
  onRetry: () => void
  onToggleAll: () => void
  onToggleTicket: (id: string) => void
  onPageChange: (page: number | ((current: number) => number)) => void
  onCreateTicket: () => void
}) {
  return (
    <>
      {isError ? (
        <ErrorState
          description="The ticket queue could not be loaded."
          onRetry={onRetry}
          title="Unable to load tickets"
        />
      ) : isLoading ? (
        <TableSkeleton>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton $height="54px" key={index} />
          ))}
        </TableSkeleton>
      ) : tickets.length ? (
        <TableScroll>
          <DataTable>
            <thead>
              <tr>
                <CheckboxCell>
                  <input
                    aria-label="Select all tickets on page"
                    checked={tickets.every((ticket) =>
                      selected.includes(ticket.id),
                    )}
                    onChange={onToggleAll}
                    type="checkbox"
                  />
                </CheckboxCell>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const customer = ticket.customer
                return (
                  <tr key={ticket.id}>
                    <CheckboxDataCell>
                      <input
                        aria-label={`Select ${ticket.key}`}
                        checked={selected.includes(ticket.id)}
                        onChange={() => onToggleTicket(ticket.id)}
                        type="checkbox"
                      />
                    </CheckboxDataCell>
                    <TicketTitleCell>
                      <Link to={`/tickets/${ticket.id}`}>
                        <span>{ticket.key}</span>
                        <strong>{ticket.title}</strong>
                      </Link>
                    </TicketTitleCell>
                    <td>
                      <CustomerCell to={`/customers/${customer?.id}`}>
                        <Avatar
                          initials={customer?.initials}
                          name={customer?.name}
                          size="xs"
                        />
                        <span>
                          <strong>{customer?.name}</strong>
                          <small>{customer?.company}</small>
                        </span>
                      </CustomerCell>
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td>
                      <AssigneeCell>
                        <Avatar size="xs" user={ticket.assignee} />
                        {ticket.assignee?.name ?? 'Unassigned'}
                      </AssigneeCell>
                    </td>
                    <MutedCell>
                      {formatRelative(ticket.updatedAt)}
                    </MutedCell>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </TableScroll>
      ) : (
        <EmptyState
          action={
            <Button icon={Plus} onClick={onCreateTicket} size="sm">
              Create ticket
            </Button>
          }
          description="Try adjusting your filters or create a new ticket."
          title="No tickets found"
        />
      )}

      {!isLoading && total ? (
        <TablePagination>
          <span>
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, total)} of {total}
          </span>
          <div>
            <Button
              disabled={safePage === 1}
              onClick={() => onPageChange((current) => current - 1)}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft size={15} /> Previous
            </Button>
            <span>
              {safePage} / {totalPages}
            </span>
            <Button
              disabled={safePage === totalPages}
              onClick={() => onPageChange((current) => current + 1)}
              size="sm"
              variant="secondary"
            >
              Next <ChevronRight size={15} />
            </Button>
          </div>
        </TablePagination>
      ) : null}
    </>
  )
}
