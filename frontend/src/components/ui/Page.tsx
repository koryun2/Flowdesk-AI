import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { media } from '../../styles/theme'

const pageIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
`

export const Page = styled.div`
  animation: ${pageIn} 220ms ease both;
`

const Header = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;

  h1 {
    margin-top: 2px;
    font-size: 25px;
    line-height: 1.2;
    letter-spacing: -0.035em;
  }

  p {
    margin-top: 6px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 12px;
  }

  ${media.phone} {
    align-items: flex-start;
    flex-direction: column;
  }

  ${media.small} {
    h1 {
      font-size: 22px;
    }
  }
`

const Eyebrow = styled.span`
  color: ${({ theme }) => theme.textTertiary};
  font-size: 10px;
  font-weight: 600;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  ${media.phone} {
    width: 100%;

    button,
    a {
      flex: 1;
    }
  }

  ${media.small} {
    flex-wrap: wrap;
  }
`

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <Header>
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <HeaderActions>{actions}</HeaderActions> : null}
    </Header>
  )
}

export const MutedCopy = styled.p`
  color: ${({ theme }) => theme.textTertiary};
  font-size: 10px;
`

export const SectionHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    font-size: 13px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }

  select {
    height: 30px;
    padding: 0 9px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 7px;
    outline: 0;
    background: #fff;
    font-size: 9px;
  }

  a {
    display: flex;
    align-items: center;
    gap: 4px;
    color: ${({ theme }) => theme.primary};
    font-size: 10px;
    font-weight: 600;
  }
`

export const BackLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  margin-bottom: 17px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 9px;

  &:hover {
    color: ${({ theme }) => theme.primary};
  }
`
