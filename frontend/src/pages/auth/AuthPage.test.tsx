import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '../../providers/AppProviders'
import { AuthPage } from './AuthPage'

function renderLogin() {
  return render(
    <AppProviders>
      <MemoryRouter>
        <AuthPage mode="login" />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('AuthPage', () => {
  it('rejects a password shorter than 8 characters', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('offers the demo workspace on the login screen', () => {
    renderLogin()

    expect(screen.getByRole('button', { name: /continue with demo workspace/i })).toBeInTheDocument()
  })
})
