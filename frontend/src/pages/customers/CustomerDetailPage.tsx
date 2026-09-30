import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  MessageSquare,
  TicketCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { FormField, FormGrid } from '../../components/fields'
import {
  BackLink,
  Button,
  ButtonLink,
  Modal,
  Page,
  PageLoader,
  SectionHeading,
} from '../../components/ui'
import { formatDate, formatRelative } from '../../lib/utils'
import { useToast } from '../../providers/toast'
import { workspaceApi } from '../../services/workspaceApi'
import type { Customer } from '../../types'
import { CustomerHero } from './CustomerHero'
import {
  ActivityCard,
  DetailGrid,
  DetailMain,
  DetailStats,
  NotFoundCard,
  StatCard,
  TimelineDot,
  TimelineItem,
} from './CustomerDetailPage.styles'
import { CustomerSidebar } from './CustomerSidebar'
import { CustomerTickets } from './CustomerTickets'

export function CustomerDetailPage() {
  const { customerId = '' } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => workspaceApi.getCustomer(customerId),
  })

  if (isLoading) return <PageLoader />
  if (isError || !data) {
    return (
      <NotFoundCard>
        <h2>Customer not found</h2>
        <p>This customer may have been removed from the workspace.</p>
        <ButtonLink to="/customers">Back to customers</ButtonLink>
      </NotFoundCard>
    )
  }

  const { customer, tickets } = data
  const resolved = tickets.filter((ticket) =>
    ['resolved', 'closed'].includes(ticket.status),
  ).length

  return (
    <Page>
      <BackLink to="/customers">
        <ArrowLeft size={15} /> Back to customers
      </BackLink>

      <CustomerHero
        customer={customer}
        onEdit={() => setEditOpen(true)}
      />

      <DetailStats>
        <StatCard>
          <span>
            <TicketCheck size={18} />
          </span>
          <div>
            <strong>{customer.totalTickets}</strong>
            <small>Total tickets</small>
          </div>
        </StatCard>
        <StatCard>
          <span>
            <MessageSquare size={18} />
          </span>
          <div>
            <strong>{customer.openTickets}</strong>
            <small>Open tickets</small>
          </div>
        </StatCard>
        <StatCard>
          <span>
            <DollarSign size={18} />
          </span>
          <div>
            <strong>${customer.lifetimeValue.toLocaleString()}</strong>
            <small>Lifetime value</small>
          </div>
        </StatCard>
        <StatCard>
          <span>
            <CalendarDays size={18} />
          </span>
          <div>
            <strong>{resolved}</strong>
            <small>Resolved recently</small>
          </div>
        </StatCard>
      </DetailStats>

      <DetailGrid>
        <DetailMain>
          <CustomerTickets customer={customer} tickets={tickets} />

          <ActivityCard>
            <SectionHeading>
              <div>
                <h2>Account activity</h2>
                <p>Important customer events</p>
              </div>
            </SectionHeading>
            <TimelineItem>
              <TimelineDot $tone="success" />
              <div>
                <p>
                  <strong>{customer.name}</strong> signed into the workspace
                </p>
                <time>{formatRelative(customer.lastSeenAt)}</time>
              </div>
            </TimelineItem>
            <TimelineItem>
              <TimelineDot $tone="ai" />
              <div>
                <p>
                  <strong>Flowdesk AI</strong> updated account health
                </p>
                <span>Calculated from ticket sentiment and response history</span>
                <time>3d ago</time>
              </div>
            </TimelineItem>
            <TimelineItem>
              <TimelineDot />
              <div>
                <p>
                  <strong>Account created</strong> on {formatDate(customer.joinedAt)}
                </p>
              </div>
            </TimelineItem>
          </ActivityCard>
        </DetailMain>

        <CustomerSidebar
          customer={customer}
          onEdit={() => setEditOpen(true)}
        />
      </DetailGrid>

      <EditCustomerModal
        customer={customer}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Page>
  )
}

function EditCustomerModal({
  customer,
  open,
  onClose,
}: {
  customer: Customer
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const { register, handleSubmit, reset } = useForm<
    Pick<Customer, 'name' | 'email' | 'company' | 'phone' | 'plan' | 'notes'>
  >({ defaultValues: customer })

  useEffect(() => reset(customer), [customer, reset])

  const mutation = useMutation({
    mutationFn: (values: Partial<Customer>) =>
      workspaceApi.updateCustomer(customer.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-summary'] })
      notify('Customer updated')
      onClose()
    },
    onError: () => notify('Unable to update customer', 'error'),
  })

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button form="edit-customer-form" type="submit">
            Save changes
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Edit customer"
    >
      <FormGrid
        as="form"
        id="edit-customer-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <FormField>
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" {...register('name')} />
        </FormField>
        <FormField>
          <label htmlFor="edit-email">Email</label>
          <input id="edit-email" type="email" {...register('email')} />
        </FormField>
        <FormField>
          <label htmlFor="edit-company">Company</label>
          <input id="edit-company" {...register('company')} />
        </FormField>
        <FormField>
          <label htmlFor="edit-plan">Plan</label>
          <select id="edit-plan" {...register('plan')}>
            <option>Starter</option>
            <option>Growth</option>
            <option>Enterprise</option>
          </select>
        </FormField>
        <FormField $full>
          <label htmlFor="edit-notes">Internal notes</label>
          <textarea id="edit-notes" rows={5} {...register('notes')} />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
