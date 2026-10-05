import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CircleAlert, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Page, PageHeader } from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import { workspaceApi } from '../../services/workspaceApi'
import type { AppNotification } from '../../services/workspaceApi'
import {
  NotificationIcon,
  NotificationItem,
  NotificationPageList,
  UnreadDot,
} from './styles'

const icons = {
  ticket: CircleAlert,
  ai: Sparkles,
  knowledge: BookOpen,
} as const

export function NotificationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => workspaceApi.listNotifications(),
  })
  const markRead = useMutation({
    mutationFn: (id?: string) => workspaceApi.markNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const items = notifications.data?.results ?? []

  const open = (item: AppNotification) => {
    if (!item.read) markRead.mutate(item.id)
    if (item.link) navigate(item.link)
  }

  return (
    <Page>
      <PageHeader
        title="Notifications"
        description="Updates from tickets, analysis, and the knowledge base."
        actions={
          <Button
            disabled={!notifications.data?.unreadCount}
            onClick={() => markRead.mutate(undefined)}
            variant="secondary"
          >
            Mark all as read
          </Button>
        }
      />
      <NotificationPageList>
        {items.length === 0 ? (
          <NotificationItem $unread={false} disabled type="button">
            <span>
              <strong>No notifications yet</strong>
              <small>New tickets, analyses, and knowledge sources will appear here.</small>
            </span>
          </NotificationItem>
        ) : (
          items.map((item) => {
            const Icon = icons[item.tone]
            return (
              <NotificationItem
                $unread={!item.read}
                key={item.id}
                onClick={() => open(item)}
                type="button"
              >
                <NotificationIcon>
                  <Icon size={16} />
                </NotificationIcon>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <time>{formatRelative(item.createdAt)}</time>
                {item.read ? null : <UnreadDot />}
              </NotificationItem>
            )
          })
        )}
      </NotificationPageList>
    </Page>
  )
}
