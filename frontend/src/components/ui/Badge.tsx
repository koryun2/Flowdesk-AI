import styled from 'styled-components'
import type { TicketPriority, TicketStatus } from '../../types'

const Badge = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;

  ${({ $tone }) => {
    if ($tone === 'new') return 'color: #4f46e5; background: #eeedff;'
    if ($tone === 'investigating') return 'color: #b65d06; background: #fff4dc;'
    if ($tone === 'waiting') return 'color: #7952b3; background: #f4edff;'
    if ($tone === 'resolved' || $tone === 'closed') return 'color: #087964; background: #e8f8f2;'
    if ($tone === 'urgent') return 'color: #c62f3e; background: #fff0f1;'
    if ($tone === 'high') return 'color: #b65d06; background: #fff6df;'
    if ($tone === 'medium') return 'color: #4f5c76; background: #eef1f7;'
    return 'color: #487361; background: #edf7f2;'
  }}
`

const BadgeDot = styled.span<{ $tone: string }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ $tone }) => {
    if ($tone === 'new') return '#4f46e5'
    if ($tone === 'investigating') return '#e2821a'
    if ($tone === 'waiting') return '#8b5cf6'
    return '#0f9f83'
  }};
`

const statusLabels: Record<TicketStatus, string> = {
  new: 'New',
  investigating: 'Investigating',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge $tone={status}>
      <BadgeDot $tone={status} />
      {statusLabels[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge $tone={priority}>{priority}</Badge>
}
