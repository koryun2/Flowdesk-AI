import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'

export const HeroCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;

  ${media.phone} {
    align-items: flex-start;
    flex-direction: column;
  }
`

export const HeroIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  p {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 10px;
  }
`

export const HeroName = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  h1 {
    font-size: 21px;
  }
`

export const HeroActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  ${media.phone} {
    width: 100%;

    & > * {
      flex: 1;
    }
  }

  ${media.small} {
    flex-direction: column;
  }
`

export const HealthBadge = styled.span<{ $health: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${({ theme, $health }) =>
    $health === 'healthy'
      ? theme.emerald
      : $health === 'at_risk'
        ? theme.amber
        : theme.red};
  background: ${({ theme, $health }) =>
    $health === 'healthy'
      ? theme.emeraldSoft
      : $health === 'at_risk'
        ? theme.amberSoft
        : theme.redSoft};

  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
`

export const DetailStats = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;

  ${media.phone} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.small} {
    grid-template-columns: 1fr;
  }
`

export const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;

  > span {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 9px;
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
  }

  > div {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 15px;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;

  ${media.laptop} {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  ${media.tablet} {
    grid-template-columns: 1fr;
  }
`

export const DetailMain = styled.div`
  display: grid;
  gap: 14px;
`

export const SidebarCard = styled(Card)`
  padding: 17px;
`

export const DetailSidebar = styled.aside`
  display: grid;
  gap: 14px;

  h3 {
    margin-bottom: 12px;
    font-size: 11px;
  }

  ${media.tablet} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${media.phone} {
    grid-template-columns: 1fr;
  }
`

export const TicketHistoryCard = styled(Card)`
  padding: 17px;
`

export const TicketList = styled.div`
  margin-top: 12px;
`

export const TicketRow = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  padding: 11px 0;
  border-top: 1px solid ${({ theme }) => theme.border};

  > div {
    display: grid;
    grid-template-columns: 50px 1fr;
    gap: 3px 8px;
  }

  > div > span {
    grid-row: 1 / 3;
    color: ${({ theme }) => theme.textTertiary};
    font-family: ui-monospace, monospace;
    font-size: 8px;
  }

  strong {
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  ${media.phone} {
    grid-template-columns: minmax(0, 1fr) auto;

    > *:last-child {
      display: none;
    }
  }
`

export const TimelineDot = styled.span<{ $tone?: 'ai' | 'success' | 'warning' }>`
  z-index: 1;
  width: 10px;
  height: 10px;
  margin-top: 2px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === 'ai'
      ? theme.violet
      : $tone === 'success'
        ? theme.emerald
        : $tone === 'warning'
          ? theme.amber
          : '#a1a6b3'};
  box-shadow: 0 0 0 1px #cdd0d8;
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

  span:not(${TimelineDot}),
  time {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const ActivityCard = styled(Card)`
  padding: 17px;

  ${TimelineItem}:first-of-type {
    margin-top: 16px;
  }
`

export const ContactList = styled.dl`
  display: grid;
  gap: 12px;

  > div {
    display: grid;
    gap: 3px;
  }

  dt {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  dd {
    padding-left: 21px;
    color: #4d5466;
    font-size: 9px;
  }
`

export const NotesCard = styled(Card)`
  padding: 17px;

  p {
    color: ${({ theme }) => theme.textSecondary};
    font-size: 9px;
    line-height: 1.6;
  }

  > small {
    display: block;
    margin-top: 10px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 7px;
  }
`

export const NotesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  button {
    border: 0;
    color: ${({ theme }) => theme.primary};
    background: transparent;
    font-size: 8px;
  }
`

export const AccountOwnerCard = styled(Card)`
  padding: 17px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  > div > span {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 9px;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
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
