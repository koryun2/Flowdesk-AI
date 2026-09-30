import {
  CheckCircle2,
  CircleAlert,
  Mail,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Button, Page, PageHeader } from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import {
  NotificationIcon,
  NotificationItem,
  NotificationPageList,
  UnreadDot,
} from './styles'

const notificationItems = [
  {
    icon: CircleAlert,
    title: 'Urgent ticket assigned to Maya',
    detail: 'FD-1284 · CSV export fails for datasets over 50k rows',
    time: new Date(Date.now() - 4 * 60_000).toISOString(),
    unread: true,
  },
  {
    icon: Sparkles,
    title: 'AI classification batch completed',
    detail: '3 new tickets were classified with an average 94% confidence.',
    time: new Date(Date.now() - 18 * 60_000).toISOString(),
    unread: true,
  },
  {
    icon: CheckCircle2,
    title: 'Knowledge source is ready',
    detail: 'Billing and subscription FAQ was split into 24 chunks.',
    time: new Date(Date.now() - 70 * 60_000).toISOString(),
    unread: true,
  },
  {
    icon: Mail,
    title: 'New customer reply',
    detail: 'Amelia replied to FD-1283.',
    time: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    unread: false,
  },
]

export function NotificationsPage() {
  const [items, setItems] = useState(notificationItems)
  return (
    <Page>
      <PageHeader
        title="Notifications"
        description="Updates from tickets, AI workflows, and your team."
        actions={
          <Button
            onClick={() =>
              setItems((current) =>
                current.map((item) => ({ ...item, unread: false })),
              )
            }
            variant="secondary"
          >
            Mark all as read
          </Button>
        }
      />
      <NotificationPageList>
        {items.map(({ icon: Icon, ...item }) => (
          <NotificationItem
            $unread={item.unread}
            key={item.title}
            onClick={() =>
              setItems((current) =>
                current.map((currentItem) =>
                  currentItem.title === item.title
                    ? { ...currentItem, unread: false }
                    : currentItem,
                ),
              )
            }
            type="button"
          >
            <NotificationIcon>
              <Icon size={18} />
            </NotificationIcon>
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <time>{formatRelative(item.time)}</time>
            {item.unread ? <UnreadDot /> : null}
          </NotificationItem>
        ))}
      </NotificationPageList>
    </Page>
  )
}
