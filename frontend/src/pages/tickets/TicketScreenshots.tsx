import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'
import { StoredImage } from '../../components/StoredImage'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { Ticket } from '../../types'
import {
  HiddenFileInput,
  ScreenshotAdd,
  ScreenshotGrid,
  ScreenshotRemove,
  ScreenshotTile,
} from './TicketDetailPage.styles'

export function TicketScreenshots({
  ticket,
  canEdit,
}: {
  ticket: Ticket
  canEdit: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await workspaceApi.addTicketAttachment(ticket.id, file)
      }
    },
    onSuccess: () => {
      refresh()
      notify('Screenshot added')
    },
    onError: (error) => {
      refresh()
      if (error instanceof ApiError) {
        notify(Object.values(error.fieldErrors)[0] || error.message, 'error')
        return
      }
      notify('The screenshot was not added', 'error')
    },
  })
  const remove = useMutation({
    mutationFn: (attachmentId: string) =>
      workspaceApi.deleteTicketAttachment(ticket.id, attachmentId),
    onSuccess: () => {
      refresh()
      notify('Screenshot removed')
    },
    onError: () => notify('The screenshot was not removed', 'error'),
  })

  if (!ticket.attachments.length && !canEdit) return null

  return (
    <ScreenshotGrid>
      {ticket.attachments.map((attachment) => (
        <ScreenshotTile key={attachment.id}>
          <StoredImage
            alt={attachment.fileName}
            path={`/api/v1/tickets/${ticket.id}/attachments/${attachment.id}/`}
            variant="tile"
          />
          {canEdit ? (
            <ScreenshotRemove
              aria-label={`Remove ${attachment.fileName}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(attachment.id)}
              type="button"
            >
              <X size={14} />
            </ScreenshotRemove>
          ) : null}
        </ScreenshotTile>
      ))}
      {canEdit ? (
        <>
          <ScreenshotAdd
            aria-label="Add screenshot"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <ImagePlus size={18} />
          </ScreenshotAdd>
          <HiddenFileInput
            accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              if (files.length) upload.mutate(files)
            }}
            ref={inputRef}
            type="file"
          />
        </>
      ) : null}
    </ScreenshotGrid>
  )
}
