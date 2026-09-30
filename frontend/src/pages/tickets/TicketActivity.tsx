import { MutedCopy } from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Activity } from '../../types'
import {
  ActivityTimeline,
  TimelineDot,
  TimelineItem,
} from './TicketDetailPage.styles'

export function TicketActivity({ activity }: { activity: Activity[] }) {
  return (
    <ActivityTimeline>
      {activity.length ? (
        activity.map((item) => (
          <TimelineItem key={item.id}>
            <TimelineDot $tone={item.tone ?? 'default'} />
            <div>
              <p>
                <strong>{item.actor}</strong> {item.action.toLowerCase()}
              </p>
              {item.detail ? <span>{item.detail}</span> : null}
              <time>{formatRelative(item.createdAt)}</time>
            </div>
          </TimelineItem>
        ))
      ) : (
        <MutedCopy>No additional activity yet.</MutedCopy>
      )}
    </ActivityTimeline>
  )
}
