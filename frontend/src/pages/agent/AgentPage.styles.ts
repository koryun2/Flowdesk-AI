import styled, { keyframes } from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'
import type { AgentMessage, AgentToolCall } from '../../types'

export const AgentLayout = styled.div`
  display: grid;
  height: calc(100vh - 165px);
  min-height: 580px;
  grid-template-columns: 245px minmax(0, 1fr);
  gap: 14px;

  ${media.tablet} {
    grid-template-columns: 1fr;
  }

  ${media.phone} {
    height: calc(100vh - 180px);
    min-height: 540px;
  }
`

export const AgentHistory = styled(Card)`
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 10px;

  ${media.tablet} {
    max-height: 180px;
  }
`

export const AgentHistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 7px 11px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;

  button {
    border: 0;
    color: ${({ theme }) => theme.textTertiary};
    background: transparent;
  }
`

export const AgentHistoryList = styled.div`
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
`

export const AgentHistoryEmpty = styled.p`
  padding: 8px 9px 12px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 8px;
  line-height: 1.5;
`

export const AgentHistoryItem = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  align-items: center;
  padding: 10px 9px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme, $active }) =>
    $active ? theme.primarySoft : 'transparent'};
  color: ${({ theme, $active }) => ($active ? theme.primary : 'inherit')};
  text-align: left;

  &:hover {
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
  }

  > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  strong {
    overflow: hidden;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 7px;
  }
`

export const AgentSafety = styled.div`
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding: 11px;
  border: 1px solid #dcd9ff;
  border-radius: 9px;
  color: ${({ theme }) => theme.violet};
  background: #f9f8ff;

  svg {
    flex: 0 0 auto;
  }

  strong {
    font-size: 9px;
  }

  p {
    margin-top: 4px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 7px;
    line-height: 1.5;
  }

  ${media.tablet} {
    display: none;
  }
`

export const AgentTools = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 15px;
  padding: 0 4px 5px;

  > span {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
  }

  > div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 7px;
    align-items: center;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 8px;

    svg:last-child {
      color: ${({ theme }) => theme.emerald};
    }
  }

  ${media.tablet} {
    display: none;
  }
`

export const AgentConsole = styled(Card)`
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
`

export const AgentConsoleHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 15px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  > div:last-child {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 10px;
  }

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const OnlineDot = styled.i`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.emerald};
`

export const AgentAvatar = styled.span<{ $size?: 'sm' | 'md' }>`
  display: grid;
  width: ${({ $size }) => ($size === 'sm' ? '30px' : '36px')};
  height: ${({ $size }) => ($size === 'sm' ? '30px' : '36px')};
  flex: 0 0 auto;
  place-items: center;
  border-radius: ${({ $size }) => ($size === 'sm' ? '9px' : '10px')};
  color: #fff;
  background: linear-gradient(145deg, #6d5dfc, #5944d8);
  box-shadow: 0 5px 14px rgba(89, 68, 216, 0.2);
`

export const AgentMessages = styled.div`
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  padding: 22px clamp(18px, 5vw, 70px);
  overflow-y: auto;
  background: #fcfcfe;

  ${media.phone} {
    padding-right: 12px;
    padding-left: 12px;
  }
`

export const AgentMessageRow = styled.article<{ $role: AgentMessage['role'] }>`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-direction: ${({ $role }) => ($role === 'user' ? 'row-reverse' : 'row')};
`

export const AgentMessageBody = styled.div<{ $role: AgentMessage['role'] }>`
  width: min(680px, calc(100% - 48px));
  ${({ $role }) =>
    $role === 'user'
      ? `
    display: flex;
    align-items: flex-end;
    flex-direction: column;
  `
      : ''}
`

export const AgentMessageAuthor = styled.span`
  display: block;
  margin-bottom: 5px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 8px;
`

export const AgentMessageBubble = styled.div<{ $role: AgentMessage['role'] }>`
  display: inline-block;
  max-width: 100%;
  padding: 11px 13px;
  border: 1px solid
    ${({ theme, $role }) => ($role === 'user' ? theme.primary : theme.border)};
  border-radius: ${({ $role }) =>
    $role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px'};
  color: ${({ $role }) => ($role === 'user' ? '#fff' : 'inherit')};
  background: ${({ theme, $role }) =>
    $role === 'user' ? theme.primary : '#fff'};
  box-shadow: ${({ theme }) => theme.shadowXs};

  p {
    font-size: 10px;
    line-height: 1.6;

    a {
      color: ${({ theme, $role }) => ($role === 'user' ? '#fff' : theme.primary)};
      font-weight: 700;
      text-decoration: underline;
    }
  }
`

export const ToolCallList = styled.div`
  display: grid;
  gap: 7px;
  margin-top: 8px;
`

export const ToolCall = styled.div<{ $status: AgentToolCall['status'] }>`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 9px;
  padding: 10px;
  border: 1px solid
    ${({ theme, $status }) =>
      $status === 'approval_required' ? '#e5d29f' : theme.border};
  border-radius: 9px;
  background: ${({ $status }) =>
    $status === 'approval_required' ? '#fffcf4' : '#fff'};

  code {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.textSecondary};
    font-family: ui-monospace, monospace;
    font-size: 8px;
    white-space: normal;
  }
`

export const ToolCallIcon = styled.div`
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 8px;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
`

export const ToolCallMain = styled.div<{ $status: AgentToolCall['status'] }>`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    strong {
      font-family: ui-monospace, monospace;
      font-size: 9px;
    }

    span {
      display: flex;
      align-items: center;
      gap: 3px;
      color: ${({ theme, $status }) =>
        $status === 'approval_required' ? theme.amber : theme.emerald};
      font-size: 7px;
    }
  }

  > p {
    margin-top: 5px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;

    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 700;
      text-decoration: underline;
    }
  }

  ${media.small} {
    header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`

export const ToolApproval = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid #eadfbe;

  p {
    flex: 1 1 240px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 8px;
    line-height: 1.45;
  }
`

const thinking = keyframes`
  to {
    opacity: 0.25;
    transform: translateY(-2px);
  }
`

export const AgentThinking = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 4px 12px 12px;
  color: ${({ theme }) => theme.textTertiary};
  background: #fff;
  font-size: 8px;

  span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${({ theme }) => theme.primary};
    animation: ${thinking} 1s infinite alternate;

    &:nth-child(2) {
      animation-delay: 160ms;
    }

    &:nth-child(3) {
      margin-right: 4px;
      animation-delay: 320ms;
    }
  }
`

export const AgentComposerWrap = styled.div`
  padding: 10px clamp(18px, 5vw, 70px) 12px;
  border-top: 1px solid ${({ theme }) => theme.border};
  background: #fff;

  ${media.phone} {
    padding-right: 12px;
    padding-left: 12px;
  }
`

export const PromptSuggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;

  button {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 8px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 7px;
    color: ${({ theme }) => theme.textSecondary};
    background: #fff;
    font-size: 8px;

    &:hover {
      border-color: #c6c2f8;
      color: ${({ theme }) => theme.primary};
    }
  }

  ${media.phone} {
    flex-wrap: nowrap;
    overflow-x: auto;

    button {
      flex: 0 0 auto;
    }
  }
`

export const AgentComposer = styled.form`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.borderStrong};
  border-radius: 11px;
  box-shadow: ${({ theme }) => theme.shadowXs};

  &:focus-within {
    border-color: #aaa5f7;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  textarea {
    width: 100%;
    padding: 10px 11px 3px;
    border: 0;
    outline: 0;
    font-size: 10px;
    resize: none;
  }

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 7px 7px 10px;

    > span {
      display: flex;
      align-items: center;
      gap: 5px;
      color: ${({ theme }) => theme.textTertiary};
      font-size: 7px;
    }

    > button {
      width: 31px;
      min-height: 30px;
      padding: 0;
    }
  }
`

export const AgentDisclaimer = styled.small`
  display: block;
  margin-top: 5px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 7px;
  text-align: center;
`
