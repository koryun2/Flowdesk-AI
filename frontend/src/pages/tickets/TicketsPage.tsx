import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Page, PageHeader } from '../../components/ui'
import { useToast } from '../../providers/toast'
import { workspaceApi } from '../../services/workspaceApi'
import type {
  TicketFilters,
  TicketPriority,
  TicketStatus,
} from '../../types'
import { CreateTicketModal } from './CreateTicketModal'
import { TicketTable } from './TicketTable'
import { TicketToolbar } from './TicketToolbar'
import { DataCard } from './TicketsPage.styles'

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const appliedQuery = useRef(query)
  const [search, setSearch] = useState(query)
  const [status, setStatus] = useState<TicketStatus | 'all'>('all')
  const [priority, setPriority] = useState<TicketPriority | 'all'>('all')
  const [assignee, setAssignee] = useState<string | 'all'>('all')
  const [sort, setSort] = useState<TicketFilters['sort']>('newest')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const pageSize = 6

  useEffect(() => {
    if (query === appliedQuery.current) return
    appliedQuery.current = query
    setSearch(query)
    setPage(1)
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = searchParams.get('q') ?? ''
      if (search === current) return
      appliedQuery.current = search
      setSearchParams(search ? { q: search } : {}, { replace: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, searchParams, setSearchParams])

  const filters = useMemo(
    () => ({ search, status, priority, assignee, sort, page, pageSize }),
    [search, status, priority, assignee, sort, page, pageSize],
  )
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => workspaceApi.listTickets(filters),
  })
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => workspaceApi.listMembers(),
  })
  const { data: summary } = useQuery({
    queryKey: ['ticket-summary'],
    queryFn: () => workspaceApi.ticketSummary(),
  })

  const tickets = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = tickets
  const activeFilters =
    Number(priority !== 'all') + Number(assignee !== 'all') + Number(!!search)

  const exportTickets = () => {
    if (!tickets.length) {
      notify('There are no tickets to export', 'error')
      return
    }
    const header = ['Key', 'Title', 'Customer', 'Status', 'Priority', 'Assignee']
    const lines = tickets.map((ticket) =>
      [
        ticket.key,
        ticket.title,
        ticket.customer?.name ?? '',
        ticket.status,
        ticket.priority,
        ticket.assignee?.name ?? 'Unassigned',
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    )
    const file = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flowdesk-tickets.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const applyToSelected = async (
    update: Parameters<typeof workspaceApi.updateTicket>[1],
  ) => {
    await Promise.all(selected.map((id) => workspaceApi.updateTicket(id, update)))
    setSelected([])
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    await queryClient.invalidateQueries({ queryKey: ['ticket-summary'] })
    notify('Selected tickets updated')
  }

  const toggleAll = () => {
    if (paginated.every((ticket) => selected.includes(ticket.id))) {
      setSelected((current) =>
        current.filter((id) => !paginated.some((ticket) => ticket.id === id)),
      )
    } else {
      setSelected((current) => [
        ...new Set([...current, ...paginated.map((ticket) => ticket.id)]),
      ])
    }
  }

  return (
    <Page>
      <PageHeader
        title="Tickets"
        description="Triage, assign, and resolve every customer request."
        actions={
          <>
            <Button icon={Download} onClick={exportTickets} variant="secondary">
              Export
            </Button>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              New ticket
            </Button>
          </>
        }
      />

      <DataCard>
        <TicketToolbar
          activeFilters={activeFilters}
          assignee={assignee}
          members={members}
          onAssigneeChange={(value) => {
            setAssignee(value)
            setPage(1)
          }}
          onAssignSelected={(value) => {
            void applyToSelected({
              assigneeId: value === 'unassigned' ? null : value,
            })
          }}
          onClearFilters={() => {
            setSearch('')
            setPriority('all')
            setAssignee('all')
            setPage(1)
          }}
          onClearSearch={() => {
            setSearch('')
            setPage(1)
          }}
          onClearSelected={() => setSelected([])}
          onPriorityChange={(value) => {
            setPriority(value)
            setPage(1)
          }}
          onPrioritySelected={(value) => {
            void applyToSelected({ priority: value })
          }}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          onSortChange={(value) => {
            setSort(value)
            setPage(1)
          }}
          onStatusChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          onStatusSelected={(value) => {
            void applyToSelected({ status: value })
          }}
          priority={priority}
          search={search}
          selected={selected}
          sort={sort}
          status={status}
          summaryTotal={summary?.total}
          total={total}
        />

        <TicketTable
          isError={isError}
          isLoading={isLoading}
          onCreateTicket={() => setCreateOpen(true)}
          onPageChange={setPage}
          onRetry={() => refetch()}
          onToggleAll={toggleAll}
          onToggleTicket={(id) =>
            setSelected((current) =>
              current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
            )
          }
          pageSize={pageSize}
          safePage={safePage}
          selected={selected}
          tickets={paginated}
          total={total}
          totalPages={totalPages}
        />
      </DataCard>

      <CreateTicketModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </Page>
  )
}
