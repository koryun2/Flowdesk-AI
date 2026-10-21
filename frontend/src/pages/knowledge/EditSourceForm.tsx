import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FilePreviewModal } from '../../components/FilePreviewModal'
import { FormError, FormField } from '../../components/fields'
import { StoredImage } from '../../components/StoredImage'
import { Button, Modal } from '../../components/ui'
import { useToast } from '../../providers/toast'
import { ApiError } from '../../services/authApi'
import { workspaceApi } from '../../services/workspaceApi'
import type { KnowledgeDocument } from '../../types'
import {
  EditFooter,
  EditorStack,
  HiddenFileInput,
  NoteRequest,
  SourceFile,
  SourceFileOpen,
  SourceFileRemove,
  SourceFiles,
  SourceSummary,
  SourceTitle,
  SourceTitleInput,
} from './KnowledgePage.styles'
import { NotesEditor } from './NotesEditor'

type SourceFileItem = {
  id: string
  fileName: string
  mimeType: string
  primary: boolean
}

type EditSourceFormProps = {
  document: KnowledgeDocument | null
  canEdit: boolean
  onClose: () => void
}

function isImageFile(file: Pick<SourceFileItem, 'fileName' | 'mimeType'>) {
  if (file.mimeType.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(file.fileName)
}

export function EditSourceForm({ document, canEdit, onClose }: EditSourceFormProps) {
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [seed, setSeed] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [requestText, setRequestText] = useState('')
  const [summary, setSummary] = useState('')
  const [preview, setPreview] = useState<SourceFileItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [formError, setFormError] = useState('')
  const loadedFor = useRef<string | null>(null)
  const contentQuery = useQuery({
    queryKey: ['document-content', document?.id],
    queryFn: () => workspaceApi.documentContent(document!.id),
    enabled: Boolean(document),
  })
  useEffect(() => {
    if (!document) {
      loadedFor.current = null
      setEditing(false)
      return
    }
    if (!contentQuery.data || loadedFor.current === document.id) return
    loadedFor.current = document.id
    setTitle(document.title)
    setNotes(contentQuery.data.notes)
    setSeed(contentQuery.data.notes)
    setSourceUrl(contentQuery.data.sourceUrl)
    setRequestText('')
    setSummary('')
    setPreview(null)
    setEditing(false)
    setFormError('')
  }, [contentQuery.data, document])

  const refreshStored = async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents'] })
    await queryClient.invalidateQueries({ queryKey: ['document-summary'] })
    await queryClient.invalidateQueries({ queryKey: ['document-content'] })
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    await queryClient.invalidateQueries({ queryKey: ['redis-jobs'] })
  }

  const mutation = useMutation({
    mutationFn: (input: { title: string; notes: string; sourceUrl?: string }) =>
      workspaceApi.updateDocument(document!.id, input),
    onSuccess: async (updated) => {
      await refreshStored()
      onClose()
      if (updated.status === 'failed') {
        notify(updated.errorMessage || 'The source could not be indexed', 'error')
        return
      }
      if (updated.status === 'processing') {
        notify('Source queued in Redis')
        return
      }
      notify('Source updated')
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(Object.values(error.fieldErrors)[0] || error.message)
        return
      }
      setFormError('The source was not saved.')
    },
  })
  const remove = useMutation({
    mutationFn: () => workspaceApi.deleteDocument(document!.id),
    onSuccess: async () => {
      await refreshStored()
      onClose()
      notify('Source deleted')
    },
    onError: () => notify('The source was not deleted', 'error'),
  })
  const addFile = useMutation({
    mutationFn: (file: File) => workspaceApi.addDocumentFile(document!.id, file),
    onSuccess: async () => {
      await refreshStored()
      notify('File added')
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? Object.values(error.fieldErrors)[0] || error.message
          : 'The file was not added'
      notify(message, 'error')
    },
  })
  const removeFile = useMutation({
    mutationFn: (fileId: string) => workspaceApi.deleteDocumentFile(document!.id, fileId),
    onSuccess: async () => {
      await refreshStored()
      notify('File removed')
    },
    onError: () => notify('The file was not removed', 'error'),
  })
  const refreshPage = useMutation({
    mutationFn: () => workspaceApi.updateDocument(document!.id, { refresh: true }),
    onSuccess: async (updated) => {
      await refreshStored()
      if (updated.status === 'failed') {
        notify(updated.errorMessage || 'The page was not fetched', 'error')
        return
      }
      notify('Page fetched')
    },
    onError: () => notify('The page was not fetched', 'error'),
  })
  const summarize = useMutation({
    mutationFn: () => workspaceApi.summarizeDocument(document!.id),
    onSuccess: (result) => setSummary(result.summary),
    onError: () => notify('The summary was not written', 'error'),
  })
  const draft = useMutation({
    mutationFn: (request: string) => workspaceApi.draftNotes(document!.id, request),
    onSuccess: (result) => {
      const next = notes.trim() ? `${notes.trim()}\n\n${result.notes.trim()}` : result.notes.trim()
      setNotes(next)
      setSeed(next)
      setRequestText('')
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? Object.values(error.fieldErrors)[0] || error.message
          : 'The assistant could not write those notes'
      notify(message, 'error')
    },
  })

  const loaded = contentQuery.data
  const files = loaded?.files ?? []
  const urlChanged = document?.sourceType === 'url' && sourceUrl.trim() !== (loaded?.sourceUrl || '')
  const notesTooShort =
    document?.sourceType === 'text' && !document.hasFile && files.length === 0 && notes.trim().length < 40
  const canSave =
    canEdit &&
    editing &&
    title.trim().length >= 3 &&
    !contentQuery.isLoading &&
    !notesTooShort &&
    (!urlChanged || sourceUrl.trim().length >= 8)

  const save = () => {
    if (!document) return
    if (!window.confirm(`Are you sure you want to update ${document.title}?`)) return
    setFormError('')
    mutation.mutate({
      title: title.trim(),
      notes,
      ...(urlChanged ? { sourceUrl: sourceUrl.trim() } : {}),
    })
  }

  const chooseFile = (file: File | null) => {
    if (fileInput.current) fileInput.current.value = ''
    if (!file || !document) return
    if (!window.confirm(`Add ${file.name} to this source?`)) return
    addFile.mutate(file)
  }

  const closeSource = () => {
    if (preview) {
      setPreview(null)
      return
    }
    onClose()
  }

  return (
    <>
    <Modal
      footer={
        <EditFooter>
          {canEdit ? (
            <Button
              disabled={remove.isPending || mutation.isPending}
              onClick={() => {
                if (document && window.confirm(`Delete ${document.title}?`)) remove.mutate()
              }}
              variant="danger"
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div>
            <Button onClick={onClose} variant="secondary">
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && !editing ? (
              <Button onClick={() => setEditing(true)}>Edit</Button>
            ) : null}
            {canEdit && editing ? (
              <Button disabled={!canSave || mutation.isPending} onClick={save}>
                {mutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </div>
        </EditFooter>
      }
      onClose={closeSource}
      open={Boolean(document)}
      title={canEdit ? 'Update source' : 'Source'}
      width="lg"
    >
      <EditorStack>
      {formError ? <FormError>{formError}</FormError> : null}
      {editing ? (
        <SourceTitleInput
          aria-label="Title"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      ) : (
        <SourceTitle>{title}</SourceTitle>
      )}
      <SourceFiles>
        {files.map((file) => (
          <SourceFile key={file.id}>
            <SourceFileOpen aria-label={`Preview ${file.fileName}`} onClick={() => setPreview(file)} type="button">
              {isImageFile(file) ? (
                <StoredImage
                  alt=""
                  path={
                    file.primary
                      ? `/api/v1/documents/${document?.id}/file/`
                      : `/api/v1/documents/${document?.id}/files/${file.id}/`
                  }
                />
              ) : (
                <FileText size={16} />
              )}
              <span>{file.fileName}</span>
            </SourceFileOpen>
            {canEdit && !file.primary ? (
              <SourceFileRemove
                aria-label={`Remove ${file.fileName}`}
                onClick={() => {
                  if (window.confirm(`Remove ${file.fileName}?`)) removeFile.mutate(file.id)
                }}
                type="button"
              >
                <X size={14} />
              </SourceFileRemove>
            ) : null}
          </SourceFile>
        ))}
        {canEdit ? (
          <Button
            disabled={addFile.isPending}
            onClick={() => fileInput.current?.click()}
            size="sm"
            variant="secondary"
          >
            {addFile.isPending ? 'Adding…' : 'Add file'}
          </Button>
        ) : null}
        <HiddenFileInput
          accept=".pdf,.docx,.txt,.md,.markdown,.html,.htm,.csv,.json,.png,.jpg,.jpeg,.webp,.gif"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          ref={fileInput}
          type="file"
        />
      </SourceFiles>
      <div>
        <Button
          disabled={!document || summarize.isPending}
          onClick={() => summarize.mutate()}
          size="sm"
          variant="secondary"
        >
          {summarize.isPending ? 'Summarizing…' : 'Summary'}
        </Button>
      </div>
      {summary ? <SourceSummary>{summary}</SourceSummary> : null}
      {editing ? (
        <NoteRequest
          onSubmit={(event) => {
            event.preventDefault()
            const request = requestText.trim()
            if (request.length < 3 || !document) return
            draft.mutate(request)
          }}
        >
          <input
            aria-label="Ask AI to add notes"
            onChange={(event) => setRequestText(event.target.value)}
            placeholder="Ask AI to add notes"
            value={requestText}
          />
          <Button disabled={draft.isPending || requestText.trim().length < 3} size="sm" type="submit">
            {draft.isPending ? 'Adding…' : 'Add'}
          </Button>
        </NoteRequest>
      ) : null}
      <NotesEditor editing={editing} onChange={setNotes} seed={seed} value={notes} />
      {document?.sourceType === 'url' ? (
        <FormField>
          <label htmlFor="edit-source-url">Public URL</label>
          <input
            disabled={!editing}
            id="edit-source-url"
            onChange={(event) => setSourceUrl(event.target.value)}
            type="url"
            value={sourceUrl}
          />
          {editing ? (
            <Button
              disabled={refreshPage.isPending || title.trim().length < 3}
              onClick={() => {
                if (window.confirm('Fetch this page again?')) refreshPage.mutate()
              }}
              size="sm"
              variant="secondary"
            >
              {refreshPage.isPending ? 'Fetching…' : 'Fetch again'}
            </Button>
          ) : null}
        </FormField>
      ) : null}
      </EditorStack>
    </Modal>
    <FilePreviewModal
      file={
        preview && document
          ? {
              fileName: preview.fileName,
              mimeType: preview.mimeType,
              path: preview.primary
                ? `/api/v1/documents/${document.id}/file/`
                : `/api/v1/documents/${document.id}/files/${preview.id}/`,
            }
          : null
      }
      onClose={() => setPreview(null)}
    />
    </>
  )
}
