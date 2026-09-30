import styled from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'

export const Breadcrumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 17px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 9px;

  a {
    color: ${({ theme }) => theme.textSecondary};

    &:hover {
      color: ${({ theme }) => theme.primary};
    }
  }
`

export const TicketDetailHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 21px;

  ${media.phone} {
    align-items: flex-start;
    flex-direction: column;
  }
`

export const TicketDetailCopy = styled.div`
  > p {
    margin-top: 7px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 10px;
  }

  > p a {
    color: ${({ theme }) => theme.primary};
    font-weight: 500;
  }

  h1 {
    max-width: 820px;
    margin-top: 7px;
    font-size: 24px;
    letter-spacing: -0.035em;
  }
`

export const TicketIdRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.textTertiary};
  font-family: ui-monospace, monospace;
  font-size: 9px;

  button {
    display: grid;
    padding: 2px;
    border: 0;
    color: ${({ theme }) => theme.textTertiary};
    background: transparent;
  }
`

export const SourceLabel = styled.span`
  padding: 2px 6px;
  border-radius: 5px;
  color: ${({ theme }) => theme.textSecondary};
  background: #e9ebf0;
  font-family: 'DM Sans', sans-serif;
  font-size: 8px;
  text-transform: uppercase;
`

export const TicketDetailActions = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;

  ${media.phone} {
    width: 100%;
  }
`

export const TicketDetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 16px;
  align-items: start;

  ${media.laptop} {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  ${media.tablet} {
    grid-template-columns: 1fr;
  }
`

export const TicketDetailMain = styled.div`
  display: grid;
  gap: 14px;
`

export const TicketSidebar = styled.aside`
  display: grid;
  gap: 14px;

  h3 {
    margin-bottom: 14px;
    font-size: 12px;
  }

  ${media.tablet} {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > :first-child {
      grid-column: 1 / -1;
    }
  }

  ${media.phone} {
    grid-template-columns: 1fr;

    > :first-child {
      grid-column: auto;
    }
  }
`

export const TicketContentCard = styled(Card)`
  padding: 18px;
`

export const TicketDescriptionAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;

  > span:not([class]) {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 10px;
  }

  small,
  time {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  time {
    margin-left: auto;
  }
`

export const TicketDescription = styled.div`
  padding: 18px 0;
  color: #444b5e;
  font-size: 12px;
  line-height: 1.7;

  p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`

export const TicketTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.border};

  span,
  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 7px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 6px;
    color: ${({ theme }) => theme.textSecondary};
    background: #fafafa;
    font-size: 8px;
  }

  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  button {
    border-style: dashed;
    background: transparent;
  }
`

export const DetailTabs = styled.div`
  display: flex;
  gap: 5px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`

export const DetailTab = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border: 0;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.primary : 'transparent')};
  color: ${({ $active, theme }) =>
    $active ? theme.primary : theme.textSecondary};
  background: transparent;
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};

  span {
    padding: 1px 5px;
    border-radius: 999px;
    background: #e9ebf1;
    font-size: 8px;
  }
`

export const Conversation = styled.div`
  display: grid;
  gap: 12px;
`

export const Comment = styled.article<{ $internal?: boolean }>`
  display: flex;
  gap: 10px;
  padding: ${({ $internal }) => ($internal ? '12px' : '4px')};
  border: ${({ $internal }) => ($internal ? '1px solid #f1deb0' : '0')};
  border-radius: ${({ $internal }) => ($internal ? '10px' : '0')};
  background: ${({ $internal }) => ($internal ? '#fffaf0' : 'transparent')};
`

export const CommentContent = styled.div`
  min-width: 0;
  flex: 1;

  header {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  strong {
    font-size: 10px;
  }

  header span {
    padding: 2px 5px;
    border-radius: 5px;
    color: ${({ theme }) => theme.amber};
    background: ${({ theme }) => theme.amberSoft};
    font-size: 7px;
    font-weight: 600;
  }

  time {
    margin-left: auto;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  p {
    margin-top: 6px;
    color: #4d5466;
    font-size: 11px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`

export const ConversationEmpty = styled(Card)`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 28px;
  color: ${({ theme }) => theme.textTertiary};

  strong {
    margin-top: 7px;
    color: ${({ theme }) => theme.text};
    font-size: 11px;
  }

  span {
    margin-top: 3px;
    font-size: 9px;
  }
`

export const ReplyBox = styled(Card)<{ $internal?: boolean }>`
  overflow: hidden;
  ${({ $internal }) =>
    $internal
      ? `
    border-color: #efdcae;
    background: #fffdf8;
  `
      : ''}

  textarea {
    width: 100%;
    padding: 14px;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 11px;
    resize: vertical;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 10px;
    border-top: 1px solid ${({ theme }) => theme.border};
  }

  footer > span {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const ReplyBoxTabs = styled.div`
  display: flex;
  padding: 7px 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`

export const ReplyBoxTab = styled.button<{
  $active?: boolean
  $internalMode?: boolean
}>`
  padding: 8px 10px;
  border: 0;
  border-bottom: 2px solid
    ${({ $active, $internalMode, theme }) =>
      $active
        ? $internalMode
          ? theme.amber
          : theme.primary
        : 'transparent'};
  color: ${({ $active, $internalMode, theme }) =>
    $active
      ? $internalMode
        ? theme.amber
        : theme.primary
      : theme.textTertiary};
  background: transparent;
  font-size: 9px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`

export const ActivityTimeline = styled(Card)`
  padding: 18px;
`

export const TimelineItem = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 10px;
  padding-bottom: 19px;

  &:not(:last-child)::before {
    position: absolute;
    top: 11px;
    bottom: 0;
    left: 5px;
    width: 1px;
    background: ${({ theme }) => theme.border};
    content: '';
  }

  p {
    color: ${({ theme }) => theme.textSecondary};
    font-size: 10px;
  }

  span:not([class]),
  time {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const TimelineDot = styled.span<{
  $tone?: 'default' | 'ai' | 'success' | 'warning' | string
}>`
  z-index: 1;
  width: 10px;
  height: 10px;
  margin-top: 2px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: ${({ theme, $tone }) => {
    if ($tone === 'ai') return theme.violet
    if ($tone === 'success') return theme.emerald
    if ($tone === 'warning') return theme.amber
    return '#a1a6b3'
  }};
  box-shadow: 0 0 0 1px #cdd0d8;
`

export const TicketPropertiesCard = styled(Card)`
  padding: 15px;
`

export const PropertyField = styled.div`
  margin-bottom: 13px;

  > label {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
  }
`

export const SelectWithBadge = styled.div`
  position: relative;
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;

  select {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
  }
`

export const AssigneeSelect = styled.div`
  position: relative;
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;

  select {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
  }
`

export const PropertyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.border};
  font-size: 9px;

  span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.textTertiary};
  }
`

export const AiAnalysisCard = styled(Card)<{ $pending?: boolean }>`
  padding: 15px;
  border-color: #dcd8ff;
  background: linear-gradient(145deg, #fff, #faf9ff);

  ${({ $pending }) =>
    $pending
      ? `
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  `
      : ''}

  > svg {
    color: ${({ theme }) => theme.violet};
  }

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  > header span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.violet};
    font-size: 10px;
    font-weight: 700;
  }

  > header small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  > p {
    margin-top: 12px;
    color: #545b6e;
    font-size: 10px;
    line-height: 1.55;
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 13px;
  }

  dl > div {
    padding: 8px;
    border-radius: 7px;
    background: #f4f3fa;
  }

  dt {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 7px;
    text-transform: uppercase;
  }

  dd {
    margin-top: 3px;
    font-size: 9px;
    font-weight: 600;
    text-transform: capitalize;
  }

  strong {
    margin-top: 6px;
    font-size: 10px;
  }

  > button {
    margin-top: 10px;
  }
`

export const Sentiment = styled.dd<{ $sentiment: string }>`
  color: ${({ theme, $sentiment }) => {
    if ($sentiment === 'negative') return theme.red
    if ($sentiment === 'positive') return theme.emerald
    return 'inherit'
  }};
`

export const SuggestedTags = styled.div`
  margin-top: 12px;

  > span {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;
  }

  button {
    padding: 3px 6px;
    border: 1px dashed #c9c5f4;
    border-radius: 5px;
    color: ${({ theme }) => theme.violet};
    background: #f7f5ff;
    font-size: 8px;
  }
`

export const AiModel = styled.small`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 7px;
`

export const CustomerSummaryCard = styled(Card)`
  padding: 15px;

  > a {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    color: ${({ theme }) => theme.primary};
    font-size: 9px;
    font-weight: 600;
  }
`

export const CustomerSummaryIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;

  > div {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 11px;
  }

  span {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const CustomerSummaryDetails = styled.div`
  display: grid;
  gap: 7px;
  margin: 13px 0;
  padding: 11px 0;
  border-top: 1px solid ${({ theme }) => theme.border};
  border-bottom: 1px solid ${({ theme }) => theme.border};

  span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 9px;
  }
`

export const NotFoundCard = styled(Card)`
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
