import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock3,
  TicketCheck,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../providers/auth-context'
import {
  ButtonLink,
  ErrorState,
  MetricCard,
  Page,
  PageHeader,
  PageLoader,
} from '../../components/ui'
import { workspaceApi } from '../../services/workspaceApi'
import { ClassificationChart } from './ClassificationChart'
import {
  DashboardGrid,
  DashboardStack,
  MetricsGrid,
} from './DashboardPage.styles'
import { InsightCard } from './InsightCard'
import { RecentTickets } from './RecentTickets'
import { TeamCard } from './TeamCard'
import { VolumeChart } from './VolumeChart'

export function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(7)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', days],
    queryFn: () => workspaceApi.getDashboard(days),
  })

  const { user } = useAuth()

  if (isLoading) return <PageLoader />
  if (isError || !data) {
    return (
      <ErrorState
        description="The operations summary could not be loaded. Check the API and try again."
        onRetry={() => refetch()}
        title="Dashboard unavailable"
      />
    )
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Monday, September 28"
        title={`Good morning, ${user?.firstName || 'there'}`}
        description="Here’s what needs your attention across product operations."
        actions={
          <ButtonLink to="/tickets">
            <TicketCheck size={17} /> View ticket queue
          </ButtonLink>
        }
      />

      <MetricsGrid aria-label="Operations metrics">
        <MetricCard
          icon={TicketCheck}
          label="Open tickets"
          tone="indigo"
          value={data.metrics.open}
        />
        <MetricCard
          icon={Clock3}
          label="Urgent"
          tone="amber"
          value={data.metrics.urgent}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Resolved"
          tone="emerald"
          value={data.metrics.resolved}
        />
        <MetricCard
          icon={UsersRound}
          label="Customers"
          tone="cyan"
          value={data.metrics.customers}
        />
      </MetricsGrid>

      <DashboardGrid>
        <VolumeChart
          days={days}
          onDaysChange={setDays}
          ticketVolume={data.ticketVolume}
        />
        <ClassificationChart
          analyzed={data.analyzed}
          averageConfidence={data.averageConfidence}
          categoryBreakdown={data.categoryBreakdown}
        />
      </DashboardGrid>

      <DashboardGrid>
        <RecentTickets tickets={data.recentTickets} />

        <DashboardStack>
          <InsightCard urgentTickets={data.urgentTickets} />
          <TeamCard team={data.team} />
        </DashboardStack>
      </DashboardGrid>
    </Page>
  )
}
