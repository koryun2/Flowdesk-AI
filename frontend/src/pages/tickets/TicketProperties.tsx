import { CalendarClock } from 'lucide-react'
import { Avatar, PriorityBadge, StatusBadge } from '../../components/ui'
import { formatDate } from '../../lib/utils'
import type { Ticket, TicketPriority, TicketStatus, User } from '../../types'
import {
  AssigneeSelect,
  PropertyField,
  PropertyRow,
  SelectWithBadge,
  TicketPropertiesCard,
} from './TicketDetailPage.styles'

export function TicketProperties({
  ticket,
  users,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
}: {
  ticket: Ticket
  users: User[]
  onStatusChange: (status: TicketStatus) => void
  onPriorityChange: (priority: TicketPriority) => void
  onAssigneeChange: (assigneeId: string | null) => void
}) {
  return (
    <TicketPropertiesCard>
      <h3>Ticket properties</h3>
      <PropertyField>
        <label htmlFor="detail-status">Status</label>
        <SelectWithBadge>
          <StatusBadge status={ticket.status} />
          <select
            id="detail-status"
            onChange={(event) =>
              onStatusChange(event.target.value as TicketStatus)
            }
            value={ticket.status}
          >
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </SelectWithBadge>
      </PropertyField>
      <PropertyField>
        <label htmlFor="detail-priority">Priority</label>
        <SelectWithBadge>
          <PriorityBadge priority={ticket.priority} />
          <select
            id="detail-priority"
            onChange={(event) =>
              onPriorityChange(event.target.value as TicketPriority)
            }
            value={ticket.priority}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </SelectWithBadge>
      </PropertyField>
      <PropertyField>
        <label htmlFor="detail-assignee">Assignee</label>
        <AssigneeSelect>
          <Avatar size="xs" user={ticket.assignee} />
          <select
            id="detail-assignee"
            onChange={(event) =>
              onAssigneeChange(event.target.value || null)
            }
            value={ticket.assignee?.id ?? ''}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </AssigneeSelect>
      </PropertyField>
      <PropertyRow>
        <span>
          <CalendarClock size={15} /> Due date
        </span>
        <strong>{ticket.dueAt ? formatDate(ticket.dueAt) : 'No due date'}</strong>
      </PropertyRow>
    </TicketPropertiesCard>
  )
}
