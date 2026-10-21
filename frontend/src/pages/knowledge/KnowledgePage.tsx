import { useMutation, useQuery } from '@tanstack/react-query'
import { BookOpenCheck, CheckCircle2, Inbox, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Page, PageHeader } from '../../components/ui'
import type { KnowledgeDocument } from '../../types'
import { useAuth } from '../../providers/auth-context'
import { useToast } from '../../providers/toast'
import { workspaceApi } from '../../services/workspaceApi'
import { AddSourceForm } from './AddSourceForm'
import { EditSourceForm } from './EditSourceForm'
import { KnowledgeAsk } from './KnowledgeAsk'
import { KnowledgeLibrary } from './KnowledgeLibrary'
import { KnowledgeStats, QueueCard, StatCard } from './KnowledgePage.styles'

export function KnowledgePage() {
  const { notify } = useToast()
  const { user } = useAuth()
  const canEdit = user?.memberships[0]?.role !== 'viewer'
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null)
  const [question, setQuestion] = useState('')
  const [submittedQuestion, setSubmittedQuestion] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const {
    data: documents = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['documents', search],
    queryFn: () => workspaceApi.listDocuments(search),
    refetchInterval: (query) =>
      query.state.data?.some((document) => document.status === 'processing') ? 2000 : false,
  })
  const summary = useQuery({
    queryKey: ['document-summary'],
    queryFn: () => workspaceApi.documentSummary(),
    refetchInterval: documents.some((document) => document.status === 'processing') ? 2000 : false,
  })
  const jobs = useQuery({
    queryKey: ['redis-jobs'],
    queryFn: () => workspaceApi.listJobs(),
    refetchInterval: (query) => ((query.state.data?.queued ?? 0) > 0 ? 2000 : 5000),
  })
  const latestJob = jobs.data?.jobs[0]
  const catalog = useQuery({
    queryKey: ['documents', ''],
    queryFn: () => workspaceApi.listDocuments(),
    refetchInterval: (query) =>
      query.state.data?.some((document) => document.status === 'processing') ? 2000 : false,
  })
  const answerMutation = useMutation({
    mutationFn: ({ question: next, documentIds }: { question: string; documentIds: string[] }) =>
      workspaceApi.askKnowledge(next, documentIds),
    onSuccess: () => setSubmittedQuestion(question),
    onError: () => notify('Unable to search the knowledge base', 'error'),
  })

  const askSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (question.trim()) {
      answerMutation.mutate({ question: question.trim(), documentIds: selectedIds })
    }
  }

  const toggleSource = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <Page>
      <PageHeader
        title="Knowledge base"
        description="Give your team and AI trusted, source-cited product knowledge."
        actions={
          <Button icon={Plus} onClick={() => setAddOpen(true)}>
            Add source
          </Button>
        }
      />

      <KnowledgeStats>
        <StatCard>
          <span>
            <BookOpenCheck size={19} />
          </span>
          <div>
            <strong>{summary.data?.documents ?? '—'}</strong>
            <small>Knowledge sources</small>
          </div>
        </StatCard>
        <StatCard>
          <span>
            <CheckCircle2 size={19} />
          </span>
          <div>
            <strong>{summary.data?.chunks ?? '—'}</strong>
            <small>Indexed chunks</small>
          </div>
        </StatCard>
        <StatCard>
          <span>
            <Sparkles size={19} />
          </span>
          <div>
            <strong>{summary.data?.ready ?? '—'}</strong>
            <small>Ready sources</small>
          </div>
        </StatCard>
      </KnowledgeStats>

      <QueueCard>
        <span>
          <Inbox size={19} />
        </span>
        <div>
          <strong>{jobs.data ? `${jobs.data.queued} waiting in Redis` : 'Redis queue'}</strong>
          <small>
            {latestJob
              ? `${latestJob.label} is ${latestJob.status}`
              : 'Indexing and ticket analysis run here'}
          </small>
        </div>
      </QueueCard>

      <KnowledgeAsk
        answer={answerMutation.data}
        documents={catalog.data ?? documents}
        isPending={answerMutation.isPending}
        onCitationClick={setSearch}
        onQuestionChange={setQuestion}
        onSubmit={askSubmit}
        onToggleSource={toggleSource}
        question={question}
        selectedIds={selectedIds}
        submittedQuestion={submittedQuestion}
      />

      <KnowledgeLibrary
        canEdit={canEdit}
        documents={documents}
        isError={isError}
        isLoading={isLoading}
        onAddSource={() => setAddOpen(true)}
        onOpenSource={setEditing}
        onRetry={() => refetch()}
        onSearchChange={setSearch}
        search={search}
      />

      <AddSourceForm onClose={() => setAddOpen(false)} open={addOpen} />
      <EditSourceForm
        canEdit={canEdit}
        document={editing}
        onClose={() => setEditing(null)}
      />
    </Page>
  )
}
