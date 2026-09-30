import { Bell, ChevronDown, LogOut, Menu, Settings } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../providers/auth-context'
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

const notifications = [
  {
    title: 'Urgent ticket assigned',
    detail: 'FD-1284 was assigned to Maya',
    time: '4m',
    tone: 'urgent',
  },
  {
    title: 'AI analysis complete',
    detail: '3 new tickets have been classified',
    time: '18m',
    tone: 'ai',
  },
  {
    title: 'Knowledge source ready',
    detail: 'Billing FAQ finished processing',
    time: '1h',
    tone: 'success',
  },
]

type TopbarProps = {
  profile: User
  onOpenMobile: () => void
}

export function Topbar({ profile, onOpenMobile }: TopbarProps) {
  const { signOut } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsRead, setNotificationsRead] = useState(false)
  const navigate = useNavigate()

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
            {notificationsRead ? null : <NotificationDot />}
          </NotificationButton>
          {notificationsOpen ? (
            <NotificationPanel>
              <PopoverHeader>
                <div>
                  <strong>Notifications</strong>
                  <span>{notificationsRead ? 'All caught up' : '3 unread'}</span>
                </div>
                <button onClick={() => setNotificationsRead(true)} type="button">
                  Mark all read
                </button>
              </PopoverHeader>
              <NotificationList>
                {notifications.map((notification) => (
                  <NotificationItem key={notification.title} type="button">
                    <NotificationItemDot $tone={notification.tone} />
                    <span>
                      <strong>{notification.title}</strong>
                      <small>{notification.detail}</small>
                    </span>
                    <time>{notification.time}</time>
                  </NotificationItem>
                ))}
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
