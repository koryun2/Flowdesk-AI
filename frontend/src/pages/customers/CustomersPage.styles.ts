import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { FormError } from '../../components/fields'
import { Card, Skeleton } from '../../components/ui'
import { media } from '../../styles/theme'

export const Metrics = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;

  ${media.phone} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.small} {
    grid-template-columns: 1fr;
  }
`

export const MetricCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
`

export const MetricIcon = styled.span<{ $tone: 'indigo' | 'emerald' | 'amber' }>`
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  color: ${({ theme, $tone }) =>
    $tone === 'emerald' ? theme.emerald : $tone === 'amber' ? theme.amber : theme.primary};
  background: ${({ theme, $tone }) =>
    $tone === 'emerald'
      ? theme.emeraldSoft
      : $tone === 'amber'
        ? theme.amberSoft
        : theme.primarySoft};
`

export const MetricBody = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: end;
  gap: 2px 8px;

  small {
    grid-column: 1 / -1;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }

  strong {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 20px;
  }
`

export const MetricHint = styled.span<{ $warning?: boolean }>`
  display: flex;
  align-items: center;
  gap: 2px;
  padding-bottom: 3px;
  color: ${({ theme, $warning }) => ($warning ? theme.amber : theme.emerald)};
  font-size: 8px;
`

export const DataCard = styled(Card)`
  overflow: hidden;
`

export const SimpleCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  h2 {
    font-size: 13px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }

  ${media.phone} {
    align-items: stretch;
    flex-direction: column;
  }
`

export const TableSearch = styled.div`
  display: flex;
  width: min(350px, 100%);
  height: 35px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.textTertiary};
  background: #fff;

  &:focus-within {
    border-color: #b8b4f8;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 10px;
  }

  button {
    display: grid;
    padding: 2px;
    border: 0;
    color: ${({ theme }) => theme.textTertiary};
    background: transparent;
  }

  ${media.phone} {
    width: 100%;
  }
`

export const TableSkeleton = styled.div`
  display: grid;
  gap: 1px;
  padding: 8px 16px;
`

export const SkeletonRow = styled(Skeleton)`
  height: 54px;
`

export const TableScroll = styled.div`
  overflow-x: auto;
`

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    height: 38px;
    padding: 0 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    border-bottom: 1px solid ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.textTertiary};
    background: #fafbfc;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td {
    height: 62px;
    padding: 8px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.border};
    font-size: 10px;
  }

  tbody tr {
    transition: background 120ms;
  }

  tbody tr:hover {
    background: #fbfbfd;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`

export const CustomerCell = styled(Link)`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 190px;

  > span:not([class]) {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 9px;
    font-weight: 500;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const PlanBadge = styled.span<{ $plan: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${({ theme, $plan }) =>
    $plan === 'enterprise' ? theme.violet : $plan === 'growth' ? theme.primary : '#687083'};
  background: ${({ theme, $plan }) =>
    $plan === 'enterprise'
      ? theme.violetSoft
      : $plan === 'growth'
        ? theme.primarySoft
        : '#eef0f4'};
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

export const TicketCountCell = styled.span`
  display: flex;
  flex-direction: column;
  font-size: 9px;

  strong {
    display: inline;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const MutedCell = styled.td`
  color: ${({ theme }) => theme.textTertiary};
  white-space: nowrap;
`

export const FullFormError = styled(FormError)`
  grid-column: 1 / -1;
`
