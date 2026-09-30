import { Filter, Search, SlidersHorizontal, X } from 'lucide-react'
import type { TicketFilters, TicketPriority, TicketStatus, User } from '../../types'
import {
  ActiveFilterRow,
  BulkBar,
  FilterControls,
  StatusTab,
  StatusTabs,
  TableSearch,
  TableToolbar,
} from './TicketsPage.styles'

const statusTabs: Array<{ value: TicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All tickets' },
  { value: 'new', label: 'New' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
]

export function TicketToolbar({
  search,
  status,
  priority,
  assignee,
  sort,
  selected,
  members,
  summaryTotal,
  total,
  activeFilters,
  onSearchChange,
  onClearSearch,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onSortChange,
  onClearFilters,
  onAssignSelected,
  onPrioritySelected,
  onStatusSelected,
  onClearSelected,
}: {
  search: string
  status: TicketStatus | 'all'
  priority: TicketPriority | 'all'
  assignee: string | 'all'
  sort: TicketFilters['sort']
  selected: string[]
  members: User[]
  summaryTotal: number | undefined
  total: number
  activeFilters: number
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  onStatusChange: (value: TicketStatus | 'all') => void
  onPriorityChange: (value: TicketPriority | 'all') => void
  onAssigneeChange: (value: string) => void
  onSortChange: (value: TicketFilters['sort']) => void
  onClearFilters: () => void
  onAssignSelected: (value: string) => void
  onPrioritySelected: (value: TicketPriority) => void
  onStatusSelected: (value: TicketStatus) => void
  onClearSelected: () => void
}) {
  return (
    <>
      <StatusTabs role="tablist">
        {statusTabs.map((tab) => (
          <StatusTab
            $active={status === tab.value}
            aria-selected={status === tab.value}
            key={tab.value}
            onClick={() => onStatusChange(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
            {tab.value === 'all' ? <span>{summaryTotal ?? total}</span> : null}
          </StatusTab>
        ))}
      </StatusTabs>

      <TableToolbar>
        <TableSearch>
          <Search size={16} />
          <input
            aria-label="Search tickets"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title, ID, or customer"
            value={search}
          />
          {search ? (
            <button
              aria-label="Clear search"
              onClick={onClearSearch}
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </TableSearch>
        <FilterControls>
          <label>
            <Filter size={15} />
            <select
              aria-label="Filter by priority"
              onChange={(event) =>
                onPriorityChange(event.target.value as TicketPriority | 'all')
              }
              value={priority}
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            <select
              aria-label="Filter by assignee"
              onChange={(event) => onAssigneeChange(event.target.value)}
              value={assignee}
            >
              <option value="all">All assignees</option>
              {members.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <SlidersHorizontal size={15} />
            <select
              aria-label="Sort tickets"
              onChange={(event) =>
                onSortChange(event.target.value as TicketFilters['sort'])
              }
              value={sort}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Highest priority</option>
            </select>
          </label>
        </FilterControls>
      </TableToolbar>

      {activeFilters ? (
        <ActiveFilterRow>
          <span>{total} matching tickets</span>
          <button onClick={onClearFilters} type="button">
            Clear filters
          </button>
        </ActiveFilterRow>
      ) : null}

      {selected.length ? (
        <BulkBar>
          <strong>{selected.length} selected</strong>
          <span />
          <select
            aria-label="Assign selected"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value
              event.currentTarget.value = ''
              if (value) onAssignSelected(value)
            }}
          >
            <option value="">Assign</option>
            <option value="unassigned">Unassigned</option>
            {members.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Set priority"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value as TicketPriority
              event.currentTarget.value = ''
              if (value) onPrioritySelected(value)
            }}
          >
            <option value="">Set priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            aria-label="Change status"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value as TicketStatus
              event.currentTarget.value = ''
              if (value) onStatusSelected(value)
            }}
          >
            <option value="">Change status</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={onClearSelected} type="button">
            Clear
          </button>
        </BulkBar>
      ) : null}
    </>
  )
}
