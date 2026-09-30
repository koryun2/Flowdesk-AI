import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'
import type { FormEvent } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormError, FormField, LabelRow, PasswordInput } from '../../components/fields'
import {
  AuthForm as Form,
  AuthFormHeading,
  AuthFormHeadingIcon,
  AuthFormPanel,
  AuthFormWrap,
  AuthLegal,
  AuthSubmit,
  AuthSwitch,
  DemoLogin,
} from './AuthPage.styles'

type AuthFormValues = {
  email: string
  password: string
  name: string
  workspace: string
}

type AuthFormProps = {
  isRegister: boolean
  formError: string
  showPassword: boolean
  onTogglePassword: () => void
  isSubmitting: boolean
  errors: FieldErrors<AuthFormValues>
  register: UseFormRegister<AuthFormValues>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onForgotPassword: () => void
  onDemoLogin: () => void
}

export function AuthForm({
  isRegister,
  formError,
  showPassword,
  onTogglePassword,
  isSubmitting,
  errors,
  register,
  onSubmit,
  onForgotPassword,
  onDemoLogin,
}: AuthFormProps) {
  return (
    <AuthFormPanel>
      <AuthFormWrap>
        <AuthFormHeading>
          <AuthFormHeadingIcon>
            <ShieldCheck size={21} />
          </AuthFormHeadingIcon>
          <h2>{isRegister ? 'Create your workspace' : 'Welcome back'}</h2>
          <p>
            {isRegister
              ? 'Start organizing customer operations in minutes.'
              : 'Sign in to continue to your operations workspace.'}
          </p>
        </AuthFormHeading>

        <Form onSubmit={onSubmit}>
          {formError ? <FormError>{formError}</FormError> : null}
          {isRegister ? (
            <FormField>
              <label htmlFor="name">Full name</label>
              <input
                aria-invalid={errors.name ? true : undefined}
                id="name"
                placeholder="Alex Morgan"
                {...register('name')}
              />
              {errors.name ? <span>{errors.name.message}</span> : null}
            </FormField>
          ) : null}

          {isRegister ? (
            <FormField>
              <label htmlFor="workspace">Workspace name</label>
              <input
                aria-invalid={errors.workspace ? true : undefined}
                id="workspace"
                placeholder="Acme Product"
                {...register('workspace')}
              />
              {errors.workspace ? <span>{errors.workspace.message}</span> : null}
            </FormField>
          ) : null}

          <FormField>
            <label htmlFor="email">Work email</label>
            <input
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              id="email"
              placeholder="you@company.com"
              type="email"
              {...register('email')}
            />
            {errors.email ? <span>{errors.email.message}</span> : null}
          </FormField>

          <FormField>
            <LabelRow>
              <label htmlFor="password">Password</label>
              {!isRegister ? (
                <button onClick={onForgotPassword} type="button">
                  Forgot password?
                </button>
              ) : null}
            </LabelRow>
            <PasswordInput>
              <input
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                aria-invalid={errors.password ? true : undefined}
                id="password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={onTogglePassword}
                type="button"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </PasswordInput>
            {errors.password ? <span>{errors.password.message}</span> : null}
          </FormField>

          <AuthSubmit disabled={isSubmitting} type="submit" variant="primary" size="md">
            {isSubmitting
              ? 'Please wait…'
              : isRegister
                ? 'Create workspace'
                : 'Sign in'}
            {!isSubmitting ? <ArrowRight size={17} /> : null}
          </AuthSubmit>

          {!isRegister ? (
            <DemoLogin onClick={onDemoLogin} type="button">
              Continue with demo workspace
            </DemoLogin>
          ) : null}
        </Form>

        <AuthSwitch>
          {isRegister ? 'Already have an account?' : 'New to Flowdesk?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </AuthSwitch>
        <AuthLegal>
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </AuthLegal>
      </AuthFormWrap>
    </AuthFormPanel>
  )
}
