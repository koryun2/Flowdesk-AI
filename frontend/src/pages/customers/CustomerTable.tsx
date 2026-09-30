import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
} from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Customer } from '../../types'
import {
  CustomerCell,
  DataCard,
  DataTable,
  HealthBadge,
  MutedCell,
  PlanBadge,
  SimpleCardHeader,
  SkeletonRow,
  TableScroll,
  TableSearch,
  TableSkeleton,
  TicketCountCell,
} from './CustomersPage.styles'

type CustomerTableProps = {
  customers: Customer[]
  isError: boolean
  isLoading: boolean
  onAddCustomer: () => void
  onRetry: () => void
  onSearchChange: (value: string) => void
  search: string
}

export function CustomerTable({
  customers,
  isError,
  isLoading,
  onAddCustomer,
  onRetry,
  onSearchChange,
  search,
}: CustomerTableProps) {
  const navigate = useNavigate()

  return (
    <DataCard>
      <SimpleCardHeader>
        <div>
          <h2>Customer directory</h2>
          <p>{customers.length} accounts shown</p>
        </div>
        <TableSearch>
          <Search size={16} />
          <input
            aria-label="Search customers"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email, company"
            value={search}
          />
        </TableSearch>
      </SimpleCardHeader>

      {isError ? (
        <ErrorState
          description="The customer directory could not be loaded."
          onRetry={onRetry}
          title="Unable to load customers"
        />
      ) : isLoading ? (
        <TableSkeleton>
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </TableSkeleton>
      ) : customers.length ? (
        <TableScroll>
          <DataTable>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Health</th>
                <th>Tickets</th>
                <th>Last active</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <CustomerCell to={`/customers/${customer.id}`}>
                      <Avatar
                        initials={customer.initials}
                        name={customer.name}
                        size="sm"
                      />
                      <span>
                        <strong>{customer.name}</strong>
                        <small>{customer.email}</small>
                      </span>
                    </CustomerCell>
                  </td>
                  <td>
                    <PlanBadge $plan={customer.plan.toLowerCase()}>
                      {customer.plan}
                    </PlanBadge>
                  </td>
                  <td>
                    <HealthBadge $health={customer.health}>
                      <i /> {customer.health.replace('_', ' ')}
                    </HealthBadge>
                  </td>
                  <td>
                    <TicketCountCell>
                      <strong>{customer.openTickets}</strong> open
                      <small>{customer.totalTickets} total</small>
                    </TicketCountCell>
                  </td>
                  <MutedCell>{formatRelative(customer.lastSeenAt)}</MutedCell>
                  <td>
                    <IconButton
                      label={`Actions for ${customer.name}`}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <MoreHorizontal size={17} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableScroll>
      ) : (
        <EmptyState
          action={
            <Button icon={Plus} onClick={onAddCustomer} size="sm">
              Add customer
            </Button>
          }
          description="Try another search or add a customer to your workspace."
          title="No customers found"
        />
      )}
    </DataCard>
  )
}
