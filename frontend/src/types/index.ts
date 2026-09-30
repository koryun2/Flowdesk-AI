export type TicketStatus =
  | 'new'
  | 'investigating'
  | 'waiting'
  | 'resolved'
  | 'closed'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type TicketCategory =
  | 'bug'
  | 'feature_request'
  | 'billing'
  | 'general_inquiry'

export interface User {
  id: string
  name: string
  email: string
  initials: string
  role: 'owner' | 'admin' | 'agent' | 'viewer'
  color: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Comment {
  id: string
  author: User
  body: string
  isInternal: boolean
  createdAt: string
}

export interface Activity {
  id: string
  actor: string
  action: string
  detail?: string
  createdAt: string
  tone?: 'default' | 'success' | 'warning' | 'ai'
}

export interface AIAnalysis {
  category: TicketCategory
  priority: TicketPriority
  sentiment: Sentiment
  summary: string
  suggestedTags: string[]
  confidence: number
  modelName: string
  createdAt: string
}

export interface Ticket {
  id: string
  key: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  source: 'web' | 'email' | 'api' | 'agent'
  customerId: string
  customer?: Pick<Customer, 'id' | 'name' | 'email' | 'company' | 'initials' | 'plan'>
  assignee: User | null
  tags: Tag[]
  comments: Comment[]
  activity: Activity[]
  analysis?: AIAnalysis
  analysisError?: string
  createdAt: string
  updatedAt: string
  dueAt?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  initials: string
  plan: 'Starter' | 'Growth' | 'Enterprise'
  health: 'healthy' | 'at_risk' | 'critical'
  joinedAt: string
  lastSeenAt: string
  totalTickets: number
  openTickets: number
  lifetimeValue: number
  notes: string
}

export interface KnowledgeDocument {
  id: string
  title: string
  sourceType: 'text' | 'file' | 'url'
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'archived'
  fileName?: string
  sourceUrl?: string
  size: string
  chunks: number
  updatedAt: string
  createdBy: string
  errorMessage?: string
}

export interface SourceCitation {
  documentId: string
  title: string
  excerpt: string
  relevance: number
}

export interface KnowledgeAnswer {
  answer: string
  sources: SourceCitation[]
}

export interface AgentToolCall {
  id: string
  name: string
  status: 'running' | 'completed' | 'approval_required' | 'cancelled'
  input: string
  result?: string
}

export interface AgentConversation {
  id: string
  title: string
  updatedAt: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  toolCalls?: AgentToolCall[]
}

export interface TicketFilters {
  search?: string
  status?: TicketStatus | 'all'
  priority?: TicketPriority | 'all'
  assignee?: string | 'all'
  sort?: 'newest' | 'oldest' | 'priority'
}

export interface TicketDraft {
  title: string
  description: string
  customerId: string
  priority: TicketPriority
  assigneeId?: string
}

export interface WorkspaceData {
  users: User[]
  customers: Customer[]
  tickets: Ticket[]
  documents: KnowledgeDocument[]
}
