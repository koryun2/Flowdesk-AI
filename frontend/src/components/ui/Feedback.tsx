import { Inbox, LoaderCircle } from 'lucide-react'
import { type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { Button } from './Button'
import { Card } from './Card'

const shimmer = keyframes`
  to {
    background-position: -200% 0;
  }
`

export const Skeleton = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width ?? '100%'};
  height: ${({ $height }) => $height ?? '12px'};
  border-radius: 7px;
  background: linear-gradient(90deg, #f0f1f5 25%, #f8f8fa 50%, #f0f1f5 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.3s infinite;
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const Spinner = styled(LoaderCircle)`
  animation: ${spin} 800ms linear infinite;
`

const Loader = styled.div`
  display: flex;
  min-height: 50vh;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 12px;
`

export function PageLoader() {
  return (
    <Loader role="status">
      <Spinner size={24} />
      <span>Loading workspace…</span>
    </Loader>
  )
}

const ErrorCard = styled(Card)`
  display: flex;
  min-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  text-align: center;

  h2 {
    font-size: 18px;
  }

  p {
    margin-bottom: 8px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 11px;
  }
`

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry?: () => void
}) {
  return (
    <ErrorCard>
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry ? (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      ) : null}
    </ErrorCard>
  )
}

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 54px 20px;
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;

  h3,
  strong {
    margin-bottom: 5px;
    font-size: 14px;
  }

  p,
  span {
    max-width: 380px;
    margin-bottom: 14px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 11px;
  }
`

const EmptyIcon = styled.span`
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  place-items: center;
  border-radius: 14px;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
`

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Empty>
      <EmptyIcon>
        <Inbox size={24} />
      </EmptyIcon>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Empty>
  )
}

export const InlineEmpty = styled(Empty)``
