export interface Membership {
  id: string
  role: 'owner' | 'admin' | 'agent' | 'viewer'
  organization: {
    id: string
    name: string
    slug: string
    plan: string
  }
}

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  timezone: string
  memberships: Membership[]
}

export interface AuthResponse {
  access: string
  refresh: string
  user: SessionUser
}

const ACCESS_KEY = 'flowdesk.access'
const REFRESH_KEY = 'flowdesk.refresh'
const ORG_KEY = 'flowdesk.organization'

export const authStorage = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  save(tokens: { access: string; refresh: string }) {
    localStorage.setItem(ACCESS_KEY, tokens.access)
    localStorage.setItem(REFRESH_KEY, tokens.refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(ORG_KEY)
  },
}

export function setActiveOrganization(organizationId: string | null) {
  if (organizationId) localStorage.setItem(ORG_KEY, organizationId)
  else localStorage.removeItem(ORG_KEY)
}

export class ApiError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.fieldErrors = fieldErrors
  }
}

function mapUser(payload: {
  id: string
  email: string
  first_name: string
  last_name: string
  timezone: string
  memberships: Membership[]
}): SessionUser {
  return {
    id: payload.id,
    email: payload.email,
    firstName: payload.first_name,
    lastName: payload.last_name,
    timezone: payload.timezone,
    memberships: payload.memberships,
  }
}

export async function parseError(response: Response) {
  const body = await response.json().catch(() => ({}))
  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (key === 'detail' || key === 'non_field_errors') continue
    fieldErrors[key === 'workspace_name' ? 'workspace' : key] = Array.isArray(value)
      ? String(value[0])
      : String(value)
  }
  const detail = body.detail ?? body.non_field_errors?.[0]
  return new ApiError(
    typeof detail === 'string' ? detail : 'Please check the form and try again.',
    fieldErrors,
  )
}

export async function registerAccount(input: {
  name: string
  email: string
  password: string
  workspace: string
}) {
  const response = await fetch('/api/v1/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      workspace_name: input.workspace,
    }),
  })
  if (!response.ok) throw await parseError(response)
  return readAuthResponse(await response.json())
}

export async function login(input: { email: string; password: string }) {
  const response = await fetch('/api/v1/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw await parseError(response)
  return readAuthResponse(await response.json())
}

export async function fetchCurrentUser() {
  const response = await authorizedFetch('/api/v1/auth/me/')
  if (!response.ok) throw await parseError(response)
  return mapUser(await response.json())
}

export async function authorizedFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  if (authStorage.access) headers.set('Authorization', `Bearer ${authStorage.access}`)
  const organizationId = localStorage.getItem(ORG_KEY)
  if (organizationId) headers.set('X-Organization-Id', organizationId)
  let response = await fetch(path, { ...options, headers })
  if (response.status !== 401 || !authStorage.refresh) return response

  const refreshed = await refreshAccessToken()
  if (!refreshed) return response
  headers.set('Authorization', `Bearer ${authStorage.access}`)
  response = await fetch(path, { ...options, headers })
  return response
}

async function refreshAccessToken() {
  const response = await fetch('/api/v1/auth/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: authStorage.refresh }),
  })
  if (!response.ok) {
    authStorage.clear()
    return false
  }
  const payload = await response.json()
  authStorage.save({
    access: payload.access,
    refresh: payload.refresh ?? authStorage.refresh ?? '',
  })
  return true
}

function readAuthResponse(payload: {
  access: string
  refresh: string
  user: Parameters<typeof mapUser>[0]
}): AuthResponse {
  const session = { access: payload.access, refresh: payload.refresh, user: mapUser(payload.user) }
  authStorage.save(session)
  return session
}
