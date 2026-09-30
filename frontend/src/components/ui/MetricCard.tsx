import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import styled from 'styled-components'
import { Card } from './Card'

const Metric = styled(Card)`
  position: relative;
  min-height: 142px;
  padding: 17px;
`

const MetricIcon = styled.div<{ $tone: 'indigo' | 'cyan' | 'amber' | 'emerald' }>`
  position: absolute;
  top: 15px;
  right: 15px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  color: ${({ theme, $tone }) =>
    $tone === 'cyan'
      ? theme.cyan
      : $tone === 'amber'
        ? theme.amber
        : $tone === 'emerald'
          ? theme.emerald
          : theme.primary};
  background: ${({ theme, $tone }) =>
    $tone === 'cyan'
      ? theme.cyanSoft
      : $tone === 'amber'
        ? theme.amberSoft
        : $tone === 'emerald'
          ? theme.emeraldSoft
          : theme.primarySoft};
`

const MetricLabel = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 10px;
  font-weight: 600;
`

const MetricValue = styled.div`
  margin-top: 14px;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 27px;
  font-weight: 700;
  letter-spacing: -0.04em;
`

const MetricChange = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 12px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 9px;

  svg,
  strong {
    color: ${({ theme }) => theme.emerald};
  }
`

export function MetricCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  tone = 'indigo',
}: {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  tone?: 'indigo' | 'cyan' | 'amber' | 'emerald'
}) {
  const favorable = (change ?? 0) >= 0
  return (
    <Metric>
      <MetricIcon $tone={tone}>
        <Icon size={19} />
      </MetricIcon>
      <MetricLabel>{label}</MetricLabel>
      <MetricValue>{value}</MetricValue>
      {change !== undefined && changeLabel ? (
        <MetricChange>
          {favorable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <strong>{Math.abs(change)}%</strong>
          <span>{changeLabel}</span>
        </MetricChange>
      ) : null}
    </Metric>
  )
}
