import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

const ShotAdd = styled.label`
  display: grid;
  width: 148px;
  height: 96px;
  place-items: center;
  border: 1px dashed #cbd0dc;
  border-radius: 8px;
  color: ${({ theme }) => theme.primary};
  background: #fafbff;
  cursor: pointer;

  input {
    display: none;
  }

  &:hover {
    border-color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
  }
`

const ShotRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ShotTile = styled.div`
  position: relative;
  width: 148px;
  height: 96px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    background: ${({ theme }) => theme.primarySoft};
  }
`

const ShotRemove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: rgb(15 23 42 / 72%);

  &:hover {
    background: ${({ theme }) => theme.red};
  }
`

const MAX_SCREENSHOTS = 8
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024

function isScreenshot(file: File) {
  return (
    file.type === 'image/png' ||
    file.type === 'image/jpeg' ||
    file.type === 'image/webp' ||
    file.type === 'image/gif' ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name)
  )
}

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
  const [files, setFiles] = useState<File[]>([])
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  )
  useEffect(
    () => () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url)
    },
    [previews],
  )
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
    mutationFn: async (input: { values: FormValues; files: File[] }) => {
      const ticket = await workspaceApi.createTicket({
        ...input.values,
        priority: input.values.priority as TicketPriority,
      })
      let uploadError = ''
      for (const file of input.files) {
        try {
          await workspaceApi.addTicketAttachment(ticket.id, file)
        } catch (error) {
          uploadError =
            error instanceof ApiError
              ? Object.values(error.fieldErrors)[0] || error.message
              : 'The screenshot was not added'
          break
        }
      }
      return { ticket, uploadError }
    },
    onSuccess: ({ ticket, uploadError }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-summary'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
      notify(`${ticket.key} created successfully`)
      if (uploadError) notify(uploadError, 'error')
      reset()
      setFiles([])
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

  const addScreenshots = (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    if (!picked.length) return
    const images = picked.filter(isScreenshot)
    if (images.length !== picked.length) {
      setFormError('Upload a PNG, JPG, WEBP, or GIF.')
    } else if (images.some((file) => file.size > MAX_SCREENSHOT_BYTES)) {
      setFormError('Files must be 8 MB or smaller.')
    } else if (files.length + images.length > MAX_SCREENSHOTS) {
      setFormError('A ticket can hold 8 screenshots.')
    } else {
      setFormError('')
    }
    const accepted = images.filter((file) => file.size <= MAX_SCREENSHOT_BYTES)
    setFiles((current) => [...current, ...accepted].slice(0, MAX_SCREENSHOTS))
  }

  const close = () => {
    if (!mutation.isPending) {
      reset()
      setFiles([])
      setFormError('')
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
          mutation.mutate({ values, files })
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
            <ShotRow>
              {previews.map((preview, index) => (
                <ShotTile key={preview.url}>
                  <img alt={preview.file.name} src={preview.url} />
                  <ShotRemove
                    aria-label={`Remove ${preview.file.name}`}
                    disabled={mutation.isPending}
                    onClick={() =>
                      setFiles((current) => current.filter((_, item) => item !== index))
                    }
                    type="button"
                  >
                    <X size={12} />
                  </ShotRemove>
                </ShotTile>
              ))}
              <ShotAdd>
                <ImagePlus size={18} />
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                  aria-label="Add screenshot"
                  disabled={mutation.isPending}
                  multiple
                  onChange={(event) => {
                    addScreenshots(event.target.files)
                    event.target.value = ''
                  }}
                  type="file"
                />
              </ShotAdd>
            </ShotRow>
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
