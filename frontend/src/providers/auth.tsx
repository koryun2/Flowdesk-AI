import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  authStorage,
  fetchCurrentUser,
  setActiveOrganization,
  type SessionUser,
} from '../services/authApi'
import { AuthContext, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    authStorage.access ? 'loading' : 'anonymous',
  )
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    if (!authStorage.access) return
    let active = true
    fetchCurrentUser()
      .then((current) => {
        if (!active) return
        setUser(current)
        setActiveOrganization(current.memberships[0]?.organization.id ?? null)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        authStorage.clear()
        setActiveOrganization(null)
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      setSession(nextUser: SessionUser) {
        setActiveOrganization(nextUser.memberships[0]?.organization.id ?? null)
        setUser(nextUser)
        setStatus('authenticated')
      },
      signOut() {
        authStorage.clear()
        setActiveOrganization(null)
        setUser(null)
        setStatus('anonymous')
      },
    }),
    [status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
