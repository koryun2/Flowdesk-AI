import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'

export const MetricsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;

  ${media.laptop} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.phone} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.small} {
    grid-template-columns: 1fr;
  }
`

export const DashboardGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.8fr);
  gap: 16px;
  margin-bottom: 16px;

  ${media.laptop} {
    grid-template-columns: 1fr;
  }
`

export const ChartCard = styled(Card)`
  min-width: 0;
  padding: 18px;
`

export const ChartWrap = styled.div`
  height: 240px;
  margin-top: 15px;
`

export const ChartLegend = styled.div`
  display: flex;
  gap: 16px;
  margin: 2px 0 0 34px;

  span {
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 9px;
  }
`

export const LegendDot = styled.i<{ $tone: 'indigo' | 'emerald' }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === 'emerald' ? theme.emerald : theme.primary};
`

export const DonutLayout = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  margin-top: 11px;

  ${media.small} {
    grid-template-columns: 135px 1fr;
  }
`

export const DonutChart = styled.div`
  position: relative;
  height: 170px;
`

export const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: none;

  strong {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 18px;
  }

  span {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const CategoryList = styled.div`
  display: grid;
  gap: 11px;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10px;
  }

  span {
    display: flex;
    align-items: center;
    gap: 7px;
    color: ${({ theme }) => theme.textSecondary};
  }

  i {
    width: 7px;
    height: 7px;
    border-radius: 2px;
  }
`

export const AiQuality = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px;
  border-radius: 8px;
  color: ${({ theme }) => theme.violet};
  background: ${({ theme }) => theme.violetSoft};
  font-size: 9px;
`

export const RecentCard = styled(Card)`
  padding: 18px;
`

export const CompactTicketList = styled.div`
  margin-top: 13px;
  border-top: 1px solid ${({ theme }) => theme.border};
`

export const CompactTicket = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 2px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  &:last-child {
    border-bottom: 0;
  }

  &:hover strong {
    color: ${({ theme }) => theme.primary};
  }

  ${media.small} {
    align-items: flex-start;
  }
`

export const CompactTicketMain = styled.div`
  display: grid;
  min-width: 0;
  grid-template-columns: 55px 1fr;
  gap: 3px 8px;

  > span {
    grid-row: 1 / 3;
    color: ${({ theme }) => theme.textTertiary};
    font-family: ui-monospace, monospace;
    font-size: 9px;
  }

  strong {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 150ms;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const CompactTicketMeta = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;

  /* PriorityBadge is first; StatusBadge second. Avatar stays visible. */
  ${media.phone} {
    > *:nth-child(1) {
      display: none;
    }
  }

  ${media.small} {
    > *:nth-child(1),
    > *:nth-child(2) {
      display: none;
    }
  }
`

export const DashboardStack = styled.div`
  display: grid;
  gap: 16px;
`

export const InsightCard = styled(Card)`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-color: #dcd9ff;
  background: linear-gradient(145deg, #faf9ff, #f5f4ff);

  > div:last-child > span {
    color: ${({ theme }) => theme.violet};
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3 {
    margin-top: 4px;
    font-size: 12px;
  }

  p {
    margin-top: 5px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 9px;
    line-height: 1.5;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    color: ${({ theme }) => theme.primary};
    font-size: 9px;
    font-weight: 600;
  }
`

export const InsightIcon = styled.div`
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: ${({ theme }) => theme.violet};
  background: #ebe7ff;
`

export const TeamCard = styled(Card)`
  padding: 18px;
`

export const TeamList = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 14px;
`

export const TeamRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;

  > span {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 10px;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const TeamResolved = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.emerald};
  font-size: 9px;
  font-weight: 600;
`
