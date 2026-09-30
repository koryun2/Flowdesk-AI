import type {
  AIAnalysis,
  AgentMessage,
  AgentToolCall,
  Customer,
  KnowledgeAnswer,
  KnowledgeDocument,
  Ticket,
  TicketDraft,
  TicketFilters,
  TicketPriority,
  TicketStatus,
  User,
} from '../types'
import { authorizedFetch, parseError } from './authApi'

interface Page<T> {
  count: number
  results: T[]
}

interface ApiUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role?: User['role']
  open_ticket_count?: number
  resolved_ticket_count?: number
}

interface ApiCustomer {
  id: string
  name: string
  email: string | null
  company: string
  phone: string
  notes: string
  plan: Customer['plan']
  health: Customer['health']
  lifetime_value: number
  ticket_count: number
  open_ticket_count: number
  created_at: string
  updated_at: string
}

interface ApiTicket {
  id: string
  key: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  source: Ticket['source']
  customer: { id: string; name: string; email: string | null; company: string }
  assignee: ApiUser | null
  tags: Ticket['tags']
  comments?: Array<{
    id: string
    author: ApiUser | null
    body: string
    is_internal: boolean
    created_at: string
  }>
  activity?: Array<{
    id: string
    actor: string
    action: string
    detail?: string
    tone?: 'default' | 'success' | 'warning' | 'ai'
    created_at: string
  }>
  analysis?: {
    status: 'completed' | 'failed' | 'pending' | 'processing'
    category?: AIAnalysis['category']
    priority?: TicketPriority
    sentiment?: AIAnalysis['sentiment']
    summary?: string
    suggested_tags?: string[]
    confidence?: number
    model_name?: string
    created_at?: string
    error_message?: string
  } | null
  due_at?: string | null
  created_at: string
  updated_at: string
}

const palette = ['#4f46e5', '#0891b2', '#d97706', '#7c3aed', '#059669']

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authorizedFetch(path, options)
  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  return response.json()
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

function toUser(user: ApiUser | null, index = 0): User | null {
  if (!user) return null
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return {
    id: user.id,
    name,
    email: user.email,
    initials: initials(name),
    role: user.role ?? 'agent',
    color: palette[index % palette.length],
  }
}

function toCustomer(customer: ApiCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email ?? '',
    company: customer.company,
    phone: customer.phone,
    initials: initials(customer.name),
    plan: customer.plan,
    health: customer.health,
    joinedAt: customer.created_at,
    lastSeenAt: customer.updated_at,
    totalTickets: customer.ticket_count ?? 0,
    openTickets: customer.open_ticket_count ?? 0,
    lifetimeValue: customer.lifetime_value ?? 0,
    notes: customer.notes ?? '',
  }
}

interface ApiDocument {
  id: string
  title: string
  source_type: KnowledgeDocument['sourceType']
  status: KnowledgeDocument['status']
  file_name?: string
  source_url?: string
  error_message?: string
  chunk_count: number
  size: string
  created_by: string
  updated_at: string
}

function toDocument(document: ApiDocument): KnowledgeDocument {
  return {
    id: document.id,
    title: document.title,
    sourceType: document.source_type,
    status: document.status,
    fileName: document.file_name || undefined,
    sourceUrl: document.source_url || undefined,
    size: document.size,
    chunks: document.chunk_count,
    updatedAt: document.updated_at,
    createdBy: document.created_by,
    errorMessage: document.error_message || undefined,
  }
}

interface ApiAgentTool {
  id: string
  name: string
  status: AgentToolCall['status']
  input: string
  result?: string
}

interface ApiAgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  tool_calls?: ApiAgentTool[]
  conversation_id?: string
}

export interface WorkspaceSettings {
  autoAnalyzeTickets: boolean
  requireAgentApproval: boolean
  analysisModel: string
}

interface ApiWorkspaceSettings {
  auto_analyze_tickets: boolean
  require_agent_approval: boolean
  analysis_model: string
}

function toWorkspaceSettings(settings: ApiWorkspaceSettings): WorkspaceSettings {
  return {
    autoAnalyzeTickets: settings.auto_analyze_tickets,
    requireAgentApproval: settings.require_agent_approval,
    analysisModel: settings.analysis_model,
  }
}

interface ApiAgentConversation {
  id: string
  title: string
  updated_at: string
  messages?: ApiAgentMessage[]
}

function toAgentTool(tool: ApiAgentTool): AgentToolCall {
  return {
    id: tool.id,
    name: tool.name,
    status: tool.status,
    input: tool.input,
    result: tool.result,
  }
}

function toAgentMessage(message: ApiAgentMessage): AgentMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    toolCalls: (message.tool_calls ?? []).map(toAgentTool),
  }
}

function toTicket(ticket: ApiTicket): Ticket {
  const customer = ticket.customer
  return {
    id: ticket.id,
    key: ticket.key,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    source: ticket.source,
    customerId: customer.id,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email ?? '',
      company: customer.company,
      initials: initials(customer.name),
      plan: 'Growth',
    },
    assignee: toUser(ticket.assignee),
    tags: ticket.tags ?? [],
    comments: (ticket.comments ?? []).map((comment) => ({
      id: comment.id,
      author: toUser(comment.author) ?? {
        id: 'system',
        name: 'Flowdesk',
        email: 'support@flowdesk.ai',
        initials: 'FD',
        role: 'agent',
        color: '#4f46e5',
      },
      body: comment.body,
      isInternal: comment.is_internal,
      createdAt: comment.created_at,
    })),
    activity: (ticket.activity ?? []).map((item) => ({
      id: item.id,
      actor: item.actor,
      action: item.action,
      detail: item.detail,
      createdAt: item.created_at,
      tone: item.tone,
    })),
    analysis:
      ticket.analysis?.status === 'completed' &&
      ticket.analysis.category &&
      ticket.analysis.priority &&
      ticket.analysis.sentiment &&
      ticket.analysis.summary &&
      ticket.analysis.model_name &&
      ticket.analysis.created_at
        ? {
            category: ticket.analysis.category,
            priority: ticket.analysis.priority,
            sentiment: ticket.analysis.sentiment,
            summary: ticket.analysis.summary,
            suggestedTags: ticket.analysis.suggested_tags ?? [],
            confidence: ticket.analysis.confidence ?? 0,
            modelName: ticket.analysis.model_name,
            createdAt: ticket.analysis.created_at,
          }
        : undefined,
    analysisError:
      ticket.analysis?.status === 'failed' ? ticket.analysis.error_message : undefined,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    dueAt: ticket.due_at ?? undefined,
  }
}

function ticketQuery(filters: TicketFilters & { page?: number; pageSize?: number }) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.priority && filters.priority !== 'all') params.set('priority', filters.priority)
  if (filters.assignee && filters.assignee !== 'all') params.set('assignee', filters.assignee)
  params.set(
    'ordering',
    filters.sort === 'oldest' ? 'created_at' : filters.sort === 'priority' ? '-priority' : '-created_at',
  )
  params.set('page', String(filters.page ?? 1))
  params.set('page_size', String(filters.pageSize ?? 20))
  return params.toString()
}

export const workspaceApi = {
  async listTickets(filters: TicketFilters & { page?: number; pageSize?: number } = {}) {
    const page = await request<Page<ApiTicket>>(`/api/v1/tickets/?${ticketQuery(filters)}`)
    return { count: page.count, results: page.results.map(toTicket) }
  },

  async ticketSummary() {
    return request<{ open: number; urgent: number; resolved: number; total: number }>(
      '/api/v1/tickets/summary/',
    )
  },

  async getTicket(id: string) {
    const [ticket, users] = await Promise.all([
      request<ApiTicket>(`/api/v1/tickets/${id}/`),
      this.listMembers(),
    ])
    const customer = await request<ApiCustomer>(`/api/v1/customers/${ticket.customer.id}/`)
    const mapped = toTicket(ticket)
    const fullCustomer = toCustomer(customer)
    mapped.customer = {
      id: fullCustomer.id,
      name: fullCustomer.name,
      email: fullCustomer.email,
      company: fullCustomer.company,
      initials: fullCustomer.initials,
      plan: fullCustomer.plan,
    }
    return { ticket: mapped, customer: fullCustomer, users }
  },

  async analyzeTicket(id: string) {
    const ticket = await request<ApiTicket>(`/api/v1/tickets/${id}/analyze/`, { method: 'POST' })
    return toTicket(ticket)
  },

  async applySuggestedTag(ticket: Ticket, name: string) {
    const params = new URLSearchParams({ search: name, page_size: '100' })
    const page = await request<Page<{ id: string; name: string; color: string }>>(
      `/api/v1/tags/?${params}`,
    )
    const existing = page.results.find((tag) => tag.name.toLowerCase() === name.toLowerCase())
    const tag =
      existing ??
      (await request<{ id: string; name: string; color: string }>('/api/v1/tags/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: '#4F46E5' }),
      }))
    await request<ApiTicket>(`/api/v1/tickets/${ticket.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: [...ticket.tags.map((item) => item.id), tag.id] }),
    })
  },

  async createTicket(draft: TicketDraft) {
    const ticket = await request<ApiTicket>('/api/v1/tickets/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        customer_id: draft.customerId,
        priority: draft.priority,
        assignee_id: draft.assigneeId || null,
      }),
    })
    return toTicket(ticket)
  },

  async updateTicket(
    id: string,
    update: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null },
  ) {
    const ticket = await request<ApiTicket>(`/api/v1/tickets/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(update.status ? { status: update.status } : {}),
        ...(update.priority ? { priority: update.priority } : {}),
        ...('assigneeId' in update ? { assignee_id: update.assigneeId } : {}),
      }),
    })
    return toTicket(ticket)
  },

  async addComment(id: string, body: string, isInternal: boolean) {
    const ticket = await request<ApiTicket>(`/api/v1/tickets/${id}/comments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, is_internal: isInternal }),
    })
    return toTicket(ticket)
  },

  async listCustomers(search = '') {
    const params = new URLSearchParams({ page_size: '100', ordering: 'name' })
    if (search.trim()) params.set('search', search.trim())
    const page = await request<Page<ApiCustomer>>(`/api/v1/customers/?${params}`)
    return { count: page.count, results: page.results.map(toCustomer) }
  },

  async customerSummary() {
    return request<{ total: number; enterprise: number; at_risk: number }>(
      '/api/v1/customers/summary/',
    )
  },

  async getCustomer(id: string) {
    const [customer, tickets] = await Promise.all([
      request<ApiCustomer>(`/api/v1/customers/${id}/`),
      request<Page<ApiTicket>>(`/api/v1/tickets/?customer=${id}&page_size=100&ordering=-created_at`),
    ])
    return { customer: toCustomer(customer), tickets: tickets.results.map(toTicket) }
  },

  async createCustomer(input: Pick<Customer, 'name' | 'email' | 'company' | 'phone' | 'plan'>) {
    const customer = await request<ApiCustomer>('/api/v1/customers/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return toCustomer(customer)
  },

  async updateCustomer(
    id: string,
    update: Partial<Pick<Customer, 'name' | 'email' | 'company' | 'phone' | 'plan' | 'notes'>>,
  ) {
    const customer = await request<ApiCustomer>(`/api/v1/customers/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    return toCustomer(customer)
  },

  async listDocuments(search = '') {
    const params = new URLSearchParams({ page_size: '100', ordering: '-updated_at' })
    if (search.trim()) params.set('search', search.trim())
    const page = await request<Page<ApiDocument>>(`/api/v1/documents/?${params}`)
    return page.results.map(toDocument)
  },

  async documentSummary() {
    return request<{ documents: number; ready: number; chunks: number }>(
      '/api/v1/documents/summary/',
    )
  },

  async createDocument(input: {
    title: string
    sourceType: KnowledgeDocument['sourceType']
    content?: string
    sourceUrl?: string
    file?: File
  }) {
    if (input.file) {
      const body = new FormData()
      body.set('title', input.title)
      body.set('source_type', 'file')
      body.set('file', input.file)
      return toDocument(await request<ApiDocument>('/api/v1/documents/', { method: 'POST', body }))
    }
    return toDocument(
      await request<ApiDocument>('/api/v1/documents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          source_type: input.sourceType,
          content: input.content ?? '',
          source_url: input.sourceUrl ?? '',
        }),
      }),
    )
  },

  async askKnowledge(question: string) {
    const answer = await request<{
      answer: string
      sources: Array<{
        document_id: string
        title: string
        excerpt: string
        relevance: number
      }>
    }>('/api/v1/documents/ask/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    return {
      answer: answer.answer,
      sources: answer.sources.map((source) => ({
        documentId: source.document_id,
        title: source.title,
        excerpt: source.excerpt,
        relevance: source.relevance,
      })),
    } satisfies KnowledgeAnswer
  },

  async listMembers() {
    const members = await request<ApiUser[]>('/api/v1/members/')
    return members.map((member, index) => ({
      ...(toUser(member, index) as User),
      active: member.open_ticket_count ?? 0,
      resolved: member.resolved_ticket_count ?? 0,
    }))
  },

  async getVolume(days: 7 | 30 = 7) {
    return request<{
      points: Array<{ date: string; created: number; resolved: number }>
      categories: Array<{ category: string; count: number }>
      average_confidence: number | null
    }>(`/api/v1/tickets/volume/?days=${days}`)
  },

  async getDashboard(days: 7 | 30 = 7) {
    const [summary, recent, members, customers, volume] = await Promise.all([
      this.ticketSummary(),
      this.listTickets({ sort: 'newest', page: 1, pageSize: 6 }),
      this.listMembers(),
      this.customerSummary(),
      this.getVolume(days),
    ])
    const analyzed = volume.categories.reduce((total, item) => total + item.count, 0)
    const categoryLabels: Record<string, { name: string; color: string }> = {
      bug: { name: 'Bugs', color: '#4f46e5' },
      feature_request: { name: 'Features', color: '#7c3aed' },
      billing: { name: 'Billing', color: '#0891b2' },
      general_inquiry: { name: 'General', color: '#94a3b8' },
    }
    return {
      metrics: {
        open: summary.open,
        urgent: summary.urgent,
        resolved: summary.resolved,
        customers: customers.total,
      },
      recentTickets: recent.results,
      urgentTickets: recent.results.filter(
        (ticket) => ticket.priority === 'urgent' && !['resolved', 'closed'].includes(ticket.status),
      ),
      ticketVolume: volume.points.map((point) => ({
        day: new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
        }),
        created: point.created,
        resolved: point.resolved,
      })),
      categoryBreakdown: volume.categories.map((item) => ({
        name: categoryLabels[item.category]?.name ?? item.category,
        value: analyzed ? Math.round((item.count / analyzed) * 100) : 0,
        color: categoryLabels[item.category]?.color ?? '#94a3b8',
      })),
      analyzed,
      averageConfidence: volume.average_confidence,
      team: members,
    }
  },

  async listAgentConversations() {
    const rows = await request<ApiAgentConversation[]>('/api/v1/agent/conversations/')
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
    }))
  },

  async getAgentConversation(id: string) {
    const payload = await request<ApiAgentConversation>(`/api/v1/agent/conversations/${id}/`)
    return (payload.messages ?? []).map(toAgentMessage)
  },

  async runAgent(message: string, prior = '', conversationId?: string | null) {
    const payload = await request<ApiAgentMessage>('/api/v1/agent/turns/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        prior,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
    })
    return {
      message: toAgentMessage(payload),
      conversationId: payload.conversation_id ?? '',
    }
  },

  async decideAgentAction(id: string, decision: 'approve' | 'cancel') {
    const tool = await request<ApiAgentTool>(`/api/v1/agent/actions/${id}/${decision}/`, {
      method: 'POST',
    })
    return toAgentTool(tool)
  },

  async getWorkspaceSettings() {
    const settings = await request<ApiWorkspaceSettings>('/api/v1/workspace/settings/')
    return toWorkspaceSettings(settings)
  },

  async saveWorkspaceSettings(settings: WorkspaceSettings) {
    const saved = await request<ApiWorkspaceSettings>('/api/v1/workspace/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auto_analyze_tickets: settings.autoAnalyzeTickets,
        require_agent_approval: settings.requireAgentApproval,
        analysis_model: settings.analysisModel,
      }),
    })
    return toWorkspaceSettings(saved)
  },
}
