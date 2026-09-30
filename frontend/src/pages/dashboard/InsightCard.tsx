import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Ticket } from '../../types'
import {
  InsightCard as InsightCardShell,
  InsightIcon,
} from './DashboardPage.styles'

type InsightCardProps = {
  urgentTickets: Ticket[]
}

export function InsightCard({ urgentTickets }: InsightCardProps) {
  return (
    <InsightCardShell>
      <InsightIcon>
        <Sparkles size={19} />
      </InsightIcon>
      <div>
        <span>Needs attention</span>
        {urgentTickets[0] ? (
          <>
            <h3>{urgentTickets[0].title}</h3>
            <p>
              {urgentTickets[0].key} is urgent and still{' '}
              {urgentTickets[0].status}.
            </p>
            <Link to={`/tickets/${urgentTickets[0].id}`}>
              Review incident <ArrowRight size={14} />
            </Link>
          </>
        ) : (
          <>
            <h3>No urgent tickets</h3>
            <p>The open queue has no urgent items right now.</p>
            <Link to="/tickets">
              View ticket queue <ArrowRight size={14} />
            </Link>
          </>
        )}
      </div>
    </InsightCardShell>
  )
}
