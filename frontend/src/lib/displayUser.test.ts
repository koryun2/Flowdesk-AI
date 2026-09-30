import { describe, expect, it } from 'vitest'
import type { SessionUser } from '../services/authApi'
import { toDisplayUser } from './displayUser'

const sessionUser: SessionUser = {
  id: 'user-1',
  email: 'koryun@flowdesk.ai',
  firstName: 'Koryun',
  lastName: 'A.',
  timezone: 'UTC',
  memberships: [
    {
      id: 'membership-1',
      role: 'owner',
      organization: {
        id: 'org-1',
        name: 'Flowdesk Labs',
        slug: 'flowdesk-labs',
        plan: 'free',
      },
    },
  ],
}

describe('toDisplayUser', () => {
  it('builds a display name and initials from the session', () => {
    const user = toDisplayUser(sessionUser)

    expect(user.name).toBe('Koryun A.')
    expect(user.initials).toBe('KA')
    expect(user.role).toBe('owner')
  })

  it('falls back to the email when the profile has no name', () => {
    const user = toDisplayUser({
      ...sessionUser,
      firstName: '',
      lastName: '',
      memberships: [],
    })

    expect(user.name).toBe('koryun@flowdesk.ai')
    expect(user.initials).toBe('K')
    expect(user.role).toBe('viewer')
  })
})
