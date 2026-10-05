import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronDown, LogOut, Menu, Settings } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRelative } from '../../lib/utils'
import { useAuth } from '../../providers/auth-context'
import { workspaceApi } from '../../services/workspaceApi'
import type { AppNotification } from '../../services/workspaceApi'
import type { User } from '../../types'
import { Avatar } from '../ui'
import {
  MobileMenuButton,
  NotificationButton,
  NotificationDot,
  NotificationItem,
  NotificationItemDot,
  NotificationList,
  NotificationPanel,
  PopoverFooter,
  PopoverHeader,
  PopoverWrap,
  ProfileButton,
  ProfileButtonCopy,
  ProfileMenu,
  ProfileMenuButton,
  ProfileMenuIdentity,
  ProfileMenuLink,
  Topbar as TopbarBar,
  TopbarActions,
  TopbarLeft,
} from './styles'

type TopbarProps = {
  profile: User
  onOpenMobile: () => void
}

export function Topbar({ profile, onOpenMobile }: TopbarProps) {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
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
  const items = notifications.data?.results.slice(0, 6) ?? []
  const unread = notifications.data?.unreadCount ?? 0

  const openNotification = (item: AppNotification) => {
    if (!item.read) markRead.mutate(item.id)
    setNotificationsOpen(false)
    if (item.link) navigate(item.link)
  }

  return (
    <TopbarBar>
      <TopbarLeft>
        <MobileMenuButton label="Open navigation" onClick={onOpenMobile}>
          <Menu size={20} />
        </MobileMenuButton>
      </TopbarLeft>

      <TopbarActions>
        <PopoverWrap>
          <NotificationButton
            label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={19} />
            {unread > 0 ? <NotificationDot /> : null}
          </NotificationButton>
          {notificationsOpen ? (
            <NotificationPanel>
              <PopoverHeader>
                <div>
                  <strong>Notifications</strong>
                  <span>{unread > 0 ? `${unread} unread` : 'All caught up'}</span>
                </div>
                <button
                  disabled={unread === 0}
                  onClick={() => markRead.mutate(undefined)}
                  type="button"
                >
                  Mark all read
                </button>
              </PopoverHeader>
              <NotificationList>
                {items.length === 0 ? (
                  <NotificationItem disabled type="button">
                    <span>
                      <strong>No notifications yet</strong>
                      <small>Ticket, analysis, and knowledge events show up here.</small>
                    </span>
                  </NotificationItem>
                ) : (
                  items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      type="button"
                    >
                      <NotificationItemDot $tone={notificationTone(notification.tone)} />
                      <span>
                        <strong>{notification.title}</strong>
                        <small>{notification.detail}</small>
                      </span>
                      <time>{formatRelative(notification.createdAt)}</time>
                    </NotificationItem>
                  ))
                )}
              </NotificationList>
              <PopoverFooter to="/notifications">View all notifications</PopoverFooter>
            </NotificationPanel>
          ) : null}
        </PopoverWrap>

        <PopoverWrap>
          <ProfileButton
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
            type="button"
          >
            <Avatar size="sm" user={profile} />
            <ProfileButtonCopy>
              <strong>{profile.name}</strong>
              <small>{profile.role}</small>
            </ProfileButtonCopy>
            <ChevronDown size={14} />
          </ProfileButton>
          {profileOpen ? (
            <ProfileMenu>
              <ProfileMenuIdentity>
                <Avatar user={profile} />
                <div>
                  <strong>{profile.name}</strong>
                  <small>{profile.email}</small>
                </div>
              </ProfileMenuIdentity>
              <ProfileMenuLink to="/settings">
                <Settings size={16} /> Account settings
              </ProfileMenuLink>
              <ProfileMenuButton
                onClick={() => {
                  signOut()
                  navigate('/login')
                }}
                type="button"
              >
                <LogOut size={16} /> Sign out
              </ProfileMenuButton>
            </ProfileMenu>
          ) : null}
        </PopoverWrap>
      </TopbarActions>
    </TopbarBar>
  )
}

function notificationTone(tone: AppNotification['tone']) {
  if (tone === 'knowledge') return 'success'
  if (tone === 'ai') return 'ai'
  return 'ticket'
}
