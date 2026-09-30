import styled from 'styled-components'
import { Card } from '../../components/ui'

export const NotificationPageList = styled(Card)`
  overflow: hidden;
`

export const NotificationItem = styled.button<{ $unread: boolean }>`
  position: relative;
  display: grid;
  width: 100%;
  grid-template-columns: auto 1fr auto;
  gap: 11px;
  align-items: center;
  padding: 14px 17px;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  background: ${({ $unread }) => ($unread ? '#faf9ff' : '#fff')};
  text-align: left;

  &:last-child {
    border-bottom: 0;
  }

  > span:nth-child(2) {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  strong {
    font-size: 10px;
  }

  small,
  time {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const NotificationIcon = styled.span`
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
`

export const UnreadDot = styled.i`
  position: absolute;
  top: 50%;
  right: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.primary};
`
