import {
  categoryBreakdown,
  currentUser,
  initialWorkspace,
  ticketVolume,
} from '../data/mockData'
import type {
  AgentMessage,
  Customer,
  KnowledgeAnswer,
  KnowledgeDocument,
  Ticket,
  TicketDraft,
  TicketFilters,
  TicketPriority,
  TicketStatus,
  WorkspaceData,
} from '../types'

const STORAGE_KEY = 'flowdesk-demo-workspace-v1'
const wait = (milliseconds = 420) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

const cloneSeed = (): WorkspaceData => structuredClone(initialWorkspace)

function readWorkspace(): WorkspaceData {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const seed = cloneSeed()
    writeWorkspace(seed)
    return seed
  }

  try {
    return JSON.parse(stored) as WorkspaceData
  } catch {
    const seed = cloneSeed()
    writeWorkspace(seed)
    return seed
  }
}

function writeWorkspace(data: WorkspaceData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const priorityRank: Record<TicketPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export const mockApi = {
  async getDashboard() {
    await wait()
    const data = readWorkspace()
    const openTickets = data.tickets.filter(
      (ticket) => !['resolved', 'closed'].includes(ticket.status),
    )
    const urgentTickets = openTickets.filter(
      (ticket) => ticket.priority === 'urgent',
    )
    const resolved = data.tickets.filter((ticket) =>
      ['resolved', 'closed'].includes(ticket.status),
    )

    return {
      metrics: {
        open: 128,
        openChange: 12,
        aiResolved: 47,
        aiResolvedChange: 18,
        averageResponse: '18m',
        responseChange: -22,
        satisfaction: '94.8%',
        satisfactionChange: 2.4,
      },
      recentTickets: data.tickets.slice(0, 6),
      urgentTickets,
      resolvedCount: resolved.length,
      ticketVolume,
      categoryBreakdown,
      team: data.users.map((user, index) => ({
        ...user,
        active: [8, 6, 5, 4][index],
        resolved: [24, 31, 28, 19][index],
      })),
    }
  },

  async listTickets(filters: TicketFilters = {}) {
    await wait(360)
    let results = [...readWorkspace().tickets]
    const term = filters.search?.trim().toLowerCase()

    if (term) {
      results = results.filter((ticket) => {
        const customer = readWorkspace().customers.find(
          (item) => item.id === ticket.customerId,
        )
        return [ticket.key, ticket.title, ticket.description, customer?.name]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(term))
      })
    }
    if (filters.status && filters.status !== 'all') {
      results = results.filter((ticket) => ticket.status === filters.status)
    }
    if (filters.priority && filters.priority !== 'all') {
      results = results.filter(
        (ticket) => ticket.priority === filters.priority,
      )
    }
    if (filters.assignee && filters.assignee !== 'all') {
      results = results.filter(
        (ticket) => ticket.assignee?.id === filters.assignee,
      )
    }

    results.sort((a, b) => {
      if (filters.sort === 'oldest') {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt)
      }
      if (filters.sort === 'priority') {
        return priorityRank[b.priority] - priorityRank[a.priority]
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    })

    return results
  },

  async getTicket(id: string) {
    await wait(300)
    const data = readWorkspace()
    const ticket = data.tickets.find((item) => item.id === id)
    if (!ticket) throw new Error('Ticket not found')
    return {
      ticket,
      customer: data.customers.find(
        (customer) => customer.id === ticket.customerId,
      ),
      users: data.users,
    }
  },

  async createTicket(draft: TicketDraft) {
    await wait(550)
    const data = readWorkspace()
    const customer = data.customers.find(
      (item) => item.id === draft.customerId,
    )
    if (!customer) throw new Error('Choose a valid customer')
    const nextNumber =
      Math.max(...data.tickets.map((ticket) => Number(ticket.key.slice(3)))) + 1
    const now = new Date().toISOString()
    const ticket: Ticket = {
      id: makeId('ticket'),
      key: `FD-${nextNumber}`,
      title: draft.title,
      description: draft.description,
      customerId: draft.customerId,
      status: 'new',
      priority: draft.priority,
      source: 'web',
      assignee:
        data.users.find((user) => user.id === draft.assigneeId) ?? null,
      tags: [],
      comments: [],
      activity: [
        {
          id: makeId('activity'),
          actor: currentUser.name,
          action: 'Created ticket',
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }
    data.tickets.unshift(ticket)
    customer.totalTickets += 1
    customer.openTickets += 1
    writeWorkspace(data)
    return ticket
  },

  async updateTicket(
    id: string,
    update: {
      status?: TicketStatus
      priority?: TicketPriority
      assigneeId?: string | null
    },
  ) {
    await wait(260)
    const data = readWorkspace()
    const ticket = data.tickets.find((item) => item.id === id)
    if (!ticket) throw new Error('Ticket not found')

    if (update.status) ticket.status = update.status
    if (update.priority) ticket.priority = update.priority
    if ('assigneeId' in update) {
      ticket.assignee =
        data.users.find((user) => user.id === update.assigneeId) ?? null
    }
    ticket.updatedAt = new Date().toISOString()
    writeWorkspace(data)
    return ticket
  },

  async addComment(id: string, body: string, isInternal: boolean) {
    await wait(300)
    const data = readWorkspace()
    const ticket = data.tickets.find((item) => item.id === id)
    if (!ticket) throw new Error('Ticket not found')
    const now = new Date().toISOString()
    ticket.comments.push({
      id: makeId('comment'),
      author: currentUser,
      body,
      isInternal,
      createdAt: now,
    })
    ticket.activity.unshift({
      id: makeId('activity'),
      actor: currentUser.name,
      action: isInternal ? 'Added internal note' : 'Replied to customer',
      createdAt: now,
    })
    ticket.updatedAt = now
    writeWorkspace(data)
    return ticket
  },

  async listCustomers(search = '') {
    await wait(360)
    const customers = readWorkspace().customers
    const term = search.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.company].some((value) =>
        value.toLowerCase().includes(term),
      ),
    )
  },

  async getCustomer(id: string) {
    await wait(300)
    const data = readWorkspace()
    const customer = data.customers.find((item) => item.id === id)
    if (!customer) throw new Error('Customer not found')
    return {
      customer,
      tickets: data.tickets.filter((ticket) => ticket.customerId === id),
    }
  },

  async createCustomer(
    input: Pick<Customer, 'name' | 'email' | 'company' | 'phone' | 'plan'>,
  ) {
    await wait(480)
    const data = readWorkspace()
    const customer: Customer = {
      id: makeId('customer'),
      ...input,
      initials: input.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      health: 'healthy',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      totalTickets: 0,
      openTickets: 0,
      lifetimeValue: 0,
      notes: '',
    }
    data.customers.unshift(customer)
    writeWorkspace(data)
    return customer
  },

  async updateCustomer(
    id: string,
    update: Partial<
      Pick<Customer, 'name' | 'email' | 'company' | 'phone' | 'plan' | 'notes'>
    >,
  ) {
    await wait(360)
    const data = readWorkspace()
    const customer = data.customers.find((item) => item.id === id)
    if (!customer) throw new Error('Customer not found')
    Object.assign(customer, update)
    writeWorkspace(data)
    return customer
  },

  async listDocuments(search = '') {
    await wait(360)
    const documents = readWorkspace().documents
    const term = search.trim().toLowerCase()
    if (!term) return documents
    return documents.filter((document) =>
      document.title.toLowerCase().includes(term),
    )
  },

  async createDocument(
    input: Pick<
      KnowledgeDocument,
      'title' | 'sourceType' | 'fileName' | 'sourceUrl'
    >,
  ) {
    await wait(600)
    const data = readWorkspace()
    const document: KnowledgeDocument = {
      id: makeId('document'),
      ...input,
      status: 'processing',
      size: input.sourceType === 'url' ? 'Pending' : '24 KB',
      chunks: 0,
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.name,
    }
    data.documents.unshift(document)
    writeWorkspace(data)
    return document
  },

  async askKnowledge(question: string): Promise<KnowledgeAnswer> {
    await wait(900)
    return {
      answer:
        question.toLowerCase().includes('export')
          ? 'Large exports are processed asynchronously. For datasets above 50,000 rows, use the background export endpoint and poll the job status until a signed download URL is returned. Export links remain active for 24 hours.'
          : 'Workspace administrators can manage this from Settings. The relevant controls are scoped per organization, and changes are recorded in the audit log.',
      sources: [
        {
          documentId: 'd-1',
          title: 'Export limits and large dataset guide',
          excerpt:
            'Exports over 50,000 rows are routed to the asynchronous worker queue...',
          relevance: 0.94,
        },
        {
          documentId: 'd-2',
          title: 'API authentication',
          excerpt:
            'Background jobs return a job identifier that can be queried with the same workspace credentials...',
          relevance: 0.82,
        },
      ],
    }
  },

  async runAgent(prompt: string): Promise<AgentMessage> {
    await wait(1050)
    const lower = prompt.toLowerCase()
    const updateIntent =
      lower.includes('update') ||
      lower.includes('close') ||
      lower.includes('assign')
    return {
      id: makeId('message'),
      role: 'assistant',
      content: updateIntent
        ? 'I found the matching ticket and prepared the requested change. Review the action below before I apply it.'
        : 'I found 3 unresolved export-related tickets. The urgent issue is FD-1284, which affects CSV datasets above 50k rows and is currently assigned to Maya.',
      createdAt: new Date().toISOString(),
      toolCalls: updateIntent
        ? [
            {
              id: makeId('tool'),
              name: 'search_tickets',
              status: 'completed',
              input: '{ query: "export", status: "unresolved" }',
              result: '3 tickets found',
            },
            {
              id: makeId('tool'),
              name: 'update_ticket',
              status: 'approval_required',
              input: '{ ticket: "FD-1284", status: "resolved" }',
            },
          ]
        : [
            {
              id: makeId('tool'),
              name: 'search_tickets',
              status: 'completed',
              input: '{ query: "export", status: "unresolved" }',
              result: 'FD-1284, FD-1262, FD-1251',
            },
          ],
    }
  },

  resetDemo() {
    writeWorkspace(cloneSeed())
  },
}
