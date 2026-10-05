import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, FileUp, Link2 } from 'lucide-react'
import { useState } from 'react'
import { FormError, FormField, InputWithIcon } from '../../components/fields'
import { Button, Modal } from '../../components/ui'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { KnowledgeDocument } from '../../types'
import {
  FileDropzone,
  SourceTypeTab,
  SourceTypeTabs,
} from './KnowledgePage.styles'

type AddSourceFormProps = {
  open: boolean
  onClose: () => void
}

export function AddSourceForm({ open, onClose }: AddSourceFormProps) {
  const [sourceType, setSourceType] =
    useState<KnowledgeDocument['sourceType']>('file')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const canSubmit =
    title.trim().length >= 3 &&
    (sourceType === 'file' ? Boolean(file) : source.trim().length >= (sourceType === 'text' ? 40 : 8))
  const mutation = useMutation({
    mutationFn: () =>
      workspaceApi.createDocument({
        title: title.trim(),
        sourceType,
        content: sourceType === 'text' ? source : undefined,
        sourceUrl: sourceType === 'url' ? source : undefined,
        file: file ?? undefined,
      }),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-summary'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setTitle('')
      setSource('')
      setFile(null)
      setFormError('')
      onClose()
      if (document.status === 'failed') {
        notify(document.errorMessage || 'The source could not be indexed', 'error')
        return
      }
      notify('Source indexed')
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(Object.values(error.fieldErrors)[0] || error.message)
        return
      }
      setFormError('Unable to add this source. Check that the API is running.')
    },
  })

  return (
    <Modal
      description="Flowdesk will split, embed, and index this content for retrieval."
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => {
              setFormError('')
              mutation.mutate()
            }}
          >
            {mutation.isPending ? 'Adding source…' : 'Add source'}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Add knowledge source"
    >
      {formError ? <FormError>{formError}</FormError> : null}
      <SourceTypeTabs>
        {[
          { id: 'file' as const, label: 'Upload file', icon: FileUp },
          { id: 'url' as const, label: 'Import URL', icon: Link2 },
          { id: 'text' as const, label: 'Paste text', icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <SourceTypeTab
            $active={sourceType === id}
            key={id}
            onClick={() => setSourceType(id)}
            type="button"
          >
            <Icon size={17} /> {label}
          </SourceTypeTab>
        ))}
      </SourceTypeTabs>
      <FormField>
        <label htmlFor="source-title">Title</label>
        <input
          id="source-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. API authentication guide"
          value={title}
        />
      </FormField>
      {sourceType === 'file' ? (
        <FileDropzone>
          <FileUp size={25} />
          <strong>{file?.name || 'Drop a file here or browse'}</strong>
          <span>PDF, DOCX, TXT, or Markdown up to 8 MB</span>
          <input
            accept=".pdf,.docx,.txt,.md"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null
              setFile(next)
              setSource(next?.name ?? '')
            }}
            type="file"
          />
        </FileDropzone>
      ) : sourceType === 'url' ? (
        <FormField>
          <label htmlFor="source-url">Public URL</label>
          <InputWithIcon>
            <ExternalLink size={15} />
            <input
              id="source-url"
              onChange={(event) => setSource(event.target.value)}
              placeholder="https://docs.example.com/guide"
              type="url"
              value={source}
            />
          </InputWithIcon>
        </FormField>
      ) : (
        <FormField>
          <label htmlFor="source-text">Content</label>
          <textarea
            id="source-text"
            onChange={(event) => setSource(event.target.value)}
            placeholder="Paste documentation or internal notes…"
            rows={8}
            value={source}
          />
        </FormField>
      )}
    </Modal>
  )
}
