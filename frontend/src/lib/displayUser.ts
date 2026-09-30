import type { SessionUser } from '../services/authApi'
import type { User } from '../types'

export function toDisplayUser(user: SessionUser): User {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return {
    id: user.id,
    name,
    email: user.email,
    initials: initials || 'U',
    role: user.memberships[0]?.role ?? 'viewer',
    color: '#4f46e5',
  }
}
