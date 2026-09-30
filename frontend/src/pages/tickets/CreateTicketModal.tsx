import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { z } from 'zod'
import { FormError, FormField, FormGrid } from '../../components/fields'
import { Button, Modal } from '../../components/ui'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import { media } from '../../styles/theme'
import type { TicketPriority } from '../../types'

const schema = z.object({
  title: z.string().min(5, 'Use at least 5 characters'),
  description: z.string().min(15, 'Add enough detail to understand the issue'),
  customerId: z.string().min(1, 'Choose a customer'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const FullFormError = styled(FormError)`
  grid-column: 1 / -1;

  ${media.phone} {
    grid-column: auto;
  }
`

export function CreateTicketModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [formError, setFormError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      customerId: '',
      priority: 'medium',
      assigneeId: '',
    },
  })

  const { data: customerPage } = useQuery({
    queryKey: ['customers', 'ticket-form'],
    queryFn: () => workspaceApi.listCustomers(),
    enabled: open,
  })
  const { data: users = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => workspaceApi.listMembers(),
    enabled: open,
  })
  const customers = customerPage?.results ?? []

  const mutation = useMutation({
    mutationFn: workspaceApi.createTicket,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-summary'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      notify(`${ticket.key} created successfully`)
      reset()
      onClose()
      navigate(`/tickets/${ticket.id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fieldMap: Record<string, keyof FormValues> = {
          customer_id: 'customerId',
          assignee_id: 'assigneeId',
        }
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          const name = fieldMap[field] ?? field
          if (name in { title: 1, description: 1, customerId: 1, priority: 1, assigneeId: 1 }) {
            setError(name as keyof FormValues, { message })
          }
        }
        if (!Object.keys(error.fieldErrors).length) setFormError(error.message)
        return
      }
      setFormError('Unable to create the ticket. Check that the API is running.')
    },
  })

  const close = () => {
    if (!mutation.isPending) {
      reset()
      onClose()
    }
  }

  return (
    <Modal
      description="Capture the customer context. Analysis runs automatically only when that workspace setting is on."
      footer={
        <>
          <Button onClick={close} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            form="create-ticket-form"
            type="submit"
          >
            {mutation.isPending ? 'Creating…' : 'Create ticket'}
          </Button>
        </>
      }
      onClose={close}
      open={open}
      title="Create ticket"
    >
      <form
        id="create-ticket-form"
        onSubmit={handleSubmit((values) => {
          setFormError('')
          mutation.mutate({
            ...values,
            priority: values.priority as TicketPriority,
          })
        })}
      >
        <FormGrid>
          {formError ? <FullFormError>{formError}</FullFormError> : null}
          <FormField $full>
            <label htmlFor="ticket-title">Title</label>
            <input
              autoFocus
              aria-invalid={errors.title ? true : undefined}
              id="ticket-title"
              placeholder="Summarize the customer issue"
              {...register('title')}
            />
            {errors.title ? <span>{errors.title.message}</span> : null}
          </FormField>
          <FormField $full>
            <label htmlFor="ticket-description">Description</label>
            <textarea
              aria-invalid={errors.description ? true : undefined}
              id="ticket-description"
              placeholder="What happened, what was expected, and how is the customer affected?"
              rows={6}
              {...register('description')}
            />
            {errors.description ? <span>{errors.description.message}</span> : null}
          </FormField>
          <FormField>
            <label htmlFor="ticket-customer">Customer</label>
            <select
              aria-invalid={errors.customerId ? true : undefined}
              id="ticket-customer"
              {...register('customerId')}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.company}
                </option>
              ))}
            </select>
            {errors.customerId ? <span>{errors.customerId.message}</span> : null}
          </FormField>
          <FormField>
            <label htmlFor="ticket-priority">Priority</label>
            <select id="ticket-priority" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </FormField>
          <FormField $full>
            <label htmlFor="ticket-assignee">Assignee</label>
            <select id="ticket-assignee" {...register('assigneeId')}>
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </FormField>
        </FormGrid>
      </form>
    </Modal>
  )
}
