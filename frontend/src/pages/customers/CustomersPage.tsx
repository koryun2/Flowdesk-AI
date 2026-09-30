import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Mail,
  Plus,
  TicketCheck,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormField, FormGrid, InputWithIcon } from '../../components/fields'
import {
  Button,
  Modal,
  Page,
  PageHeader,
} from '../../components/ui'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { Customer } from '../../types'
import { CustomerTable } from './CustomerTable'
import {
  FullFormError,
  MetricBody,
  MetricCard,
  MetricHint,
  MetricIcon,
  Metrics,
} from './CustomersPage.styles'

const customerSchema = z.object({
  name: z.string().min(2, 'Enter the customer name'),
  email: z.string().email('Enter a valid email'),
  company: z.string().min(2, 'Enter the company name'),
  phone: z.string().optional(),
  plan: z.enum(['Starter', 'Growth', 'Enterprise']),
})

type CustomerForm = z.infer<typeof customerSchema>

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => workspaceApi.listCustomers(search),
  })
  const { data: summary } = useQuery({
    queryKey: ['customer-summary'],
    queryFn: () => workspaceApi.customerSummary(),
  })
  const customers = data?.results ?? []

  return (
    <Page>
      <PageHeader
        title="Customers"
        description="Understand every account, relationship, and support signal."
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Add customer
          </Button>
        }
      />

      <Metrics>
        <MetricCard>
          <MetricIcon $tone="indigo">
            <UsersRound size={19} />
          </MetricIcon>
          <MetricBody>
            <small>Total customers</small>
            <strong>{summary?.total ?? customers.length}</strong>
            <MetricHint>In this workspace</MetricHint>
          </MetricBody>
        </MetricCard>
        <MetricCard>
          <MetricIcon $tone="emerald">
            <Building2 size={19} />
          </MetricIcon>
          <MetricBody>
            <small>Enterprise accounts</small>
            <strong>{summary?.enterprise ?? 0}</strong>
            <MetricHint>Enterprise plan</MetricHint>
          </MetricBody>
        </MetricCard>
        <MetricCard>
          <MetricIcon $tone="amber">
            <TicketCheck size={19} />
          </MetricIcon>
          <MetricBody>
            <small>Accounts at risk</small>
            <strong>{summary?.at_risk ?? 0}</strong>
            <MetricHint $warning>Needs attention</MetricHint>
          </MetricBody>
        </MetricCard>
      </Metrics>

      <CustomerTable
        customers={customers}
        isError={isError}
        isLoading={isLoading}
        onAddCustomer={() => setCreateOpen(true)}
        onRetry={() => refetch()}
        onSearchChange={setSearch}
        search={search}
      />

      <CreateCustomerModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </Page>
  )
}

function CreateCustomerModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [formError, setFormError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { plan: 'Growth' },
  })
  const mutation = useMutation({
    mutationFn: (values: CustomerForm) =>
      workspaceApi.createCustomer({
        ...values,
        phone: values.phone ?? '',
        plan: values.plan as Customer['plan'],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-summary'] })
      notify('Customer added')
      reset()
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === 'name' || field === 'email' || field === 'company' || field === 'phone' || field === 'plan') {
            setError(field, { message })
          }
        }
        if (!Object.keys(error.fieldErrors).length) setFormError(error.message)
        return
      }
      setFormError('Unable to add the customer. Check that the API is running.')
    },
  })

  return (
    <Modal
      description="Add the primary contact and account information."
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            form="create-customer-form"
            type="submit"
          >
            {mutation.isPending ? 'Adding…' : 'Add customer'}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Add customer"
    >
      <FormGrid
        as="form"
        id="create-customer-form"
        onSubmit={handleSubmit((values) => {
          setFormError('')
          mutation.mutate(values)
        })}
      >
        {formError ? <FullFormError>{formError}</FullFormError> : null}
        <FormField>
          <label htmlFor="customer-name">Full name</label>
          <input
            aria-invalid={errors.name ? true : undefined}
            id="customer-name"
            placeholder="Alex Morgan"
            {...register('name')}
          />
          {errors.name ? <span>{errors.name.message}</span> : null}
        </FormField>
        <FormField>
          <label htmlFor="customer-email">Email</label>
          <InputWithIcon>
            <Mail size={15} />
            <input
              aria-invalid={errors.email ? true : undefined}
              id="customer-email"
              placeholder="alex@company.com"
              {...register('email')}
            />
          </InputWithIcon>
          {errors.email ? <span>{errors.email.message}</span> : null}
        </FormField>
        <FormField>
          <label htmlFor="customer-company">Company</label>
          <input
            aria-invalid={errors.company ? true : undefined}
            id="customer-company"
            placeholder="Acme Inc."
            {...register('company')}
          />
          {errors.company ? <span>{errors.company.message}</span> : null}
        </FormField>
        <FormField>
          <label htmlFor="customer-phone">Phone</label>
          <input
            id="customer-phone"
            placeholder="+1 555 000 0000"
            {...register('phone')}
          />
        </FormField>
        <FormField $full>
          <label htmlFor="customer-plan">Plan</label>
          <select id="customer-plan" {...register('plan')}>
            <option>Starter</option>
            <option>Growth</option>
            <option>Enterprise</option>
          </select>
        </FormField>
      </FormGrid>
    </Modal>
  )
}
