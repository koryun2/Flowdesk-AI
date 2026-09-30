import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import type { LucideIcon } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const buttonCss = css<{ $variant?: ButtonVariant; $size?: ButtonSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none;
  transition:
    transform 120ms,
    border-color 150ms,
    background 150ms,
    box-shadow 150ms;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  ${({ $size = 'md' }) =>
    $size === 'sm'
      ? css`
          min-height: 32px;
          padding: 0 10px;
          font-size: 10px;
        `
      : css`
          min-height: 38px;
          padding: 0 14px;
          font-size: 11px;
        `}

  ${({ theme, $variant = 'primary' }) => {
    if ($variant === 'secondary') {
      return css`
        border-color: ${theme.border};
        color: #454b5d;
        background: #fff;
        box-shadow: none;
        &:hover:not(:disabled) {
          border-color: #cfd2dd;
          background: #fafafa;
        `
    }
    if ($variant === 'ghost') {
      return css`
        color: ${theme.textSecondary};
        background: transparent;
        box-shadow: none;
      `
    }
    if ($variant === 'danger') {
      return css`
        color: #fff;
        background: ${theme.red};
      `
    }
    return css`
      color: #fff;
      background: ${theme.primary};
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.18);
      &:hover:not(:disabled) {
        background: ${theme.primaryHover};
      `
  }}
`

const StyledButton = styled.button<{ $variant?: ButtonVariant; $size?: ButtonSize }>`
  ${buttonCss}
`

export const ButtonLink = styled(Link)<{ $variant?: ButtonVariant; $size?: ButtonSize }>`
  ${buttonCss}
`

export const ButtonAnchor = styled.a<{ $variant?: ButtonVariant; $size?: ButtonSize }>`
  ${buttonCss}
`

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <StyledButton $size={size} $variant={variant} type={type} {...props}>
      {Icon ? <Icon size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </StyledButton>
  )
}

const StyledIconButton = styled.button`
  position: relative;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #6e7587;
  background: transparent;

  &:hover {
    border-color: ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.text};
    background: #fafafa;
  }
`

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <StyledIconButton aria-label={label} title={label} type="button" {...props}>
      {children}
    </StyledIconButton>
  )
}
