import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../providers/auth-context'
import { useToast } from '../../providers/toast'
import { ApiError, login, registerAccount } from '../../services/authApi'
import { AuthForm } from './AuthForm'
import { AuthLayout } from './AuthPage.styles'
import { AuthShowcase } from './AuthShowcase'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Enter your full name'),
  workspace: z.string().min(2, 'Enter a workspace name'),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { notify } = useToast()
  const { setSession } = useAuth()
  const [formError, setFormError] = useState('')
  const isRegister = mode === 'register'
  const schema = isRegister ? registerSchema : loginSchema
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: isRegister ? '' : 'koryun@flowdesk.ai',
      password: isRegister ? '' : 'flowdesk',
      name: '',
      workspace: '',
    },
  })

  const submit = async (values: LoginValues | RegisterValues) => {
    setFormError('')
    try {
      const session = isRegister
        ? await registerAccount({
            name: 'name' in values ? values.name : '',
            email: values.email,
            password: values.password,
            workspace: 'workspace' in values ? values.workspace : '',
          })
        : await login(values)
      setSession(session.user)
      notify(isRegister ? 'Workspace created successfully' : 'Welcome back to Flowdesk')
      navigate('/')
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof RegisterValues, { message })
        }
        return
      }
      setFormError('Unable to reach the API. Check that the backend is running.')
    }
  }

  const continueWithDemo = async () => {
    setFormError('')
    try {
      const session = await login({
        email: 'koryun@flowdesk.ai',
        password: 'flowdesk',
      })
      setSession(session.user)
      notify('Signed in to the demo workspace')
      navigate('/')
    } catch {
      setFormError('The demo account is not available yet.')
    }
  }

  return (
    <AuthLayout>
      <AuthShowcase />
      <AuthForm
        errors={errors}
        formError={formError}
        isRegister={isRegister}
        isSubmitting={isSubmitting}
        onDemoLogin={() => {
          void continueWithDemo()
        }}
        onForgotPassword={() =>
          notify('Password reset is not available. Sign in with your current password.')
        }
        onSubmit={handleSubmit(submit)}
        onTogglePassword={() => setShowPassword((visible) => !visible)}
        register={register}
        showPassword={showPassword}
      />
    </AuthLayout>
  )
}
