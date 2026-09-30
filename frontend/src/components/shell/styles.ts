import { NavLink } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { media } from '../../styles/theme'
import { IconButton } from '../ui'

const popoverIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px) scale(0.98);
  }
`

export const Shell = styled.div`
  min-height: 100vh;
`

export const BrandMark = styled.span`
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(145deg, #665cf6, #4037c8);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.25);
`

export const BrandText = styled.span<{ $collapsed: boolean }>`
  ${({ $collapsed }) =>
    $collapsed &&
    css`
      display: none;
    `}

  strong {
    color: ${({ theme }) => theme.primary};
  }
`

export const Brand = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
`

export const SidebarBrand = styled.div<{ $collapsed: boolean }>`
  display: flex;
  height: ${({ theme }) => theme.topbarHeight};
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'space-between')};
  padding: ${({ $collapsed }) => ($collapsed ? '0' : '0 18px')};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`

export const MobileCloseButton = styled(IconButton)`
  display: none;

  ${media.tablet} {
    display: grid;
  }
`

export const MobileMenuButton = styled(IconButton)`
  display: none;

  ${media.tablet} {
    display: grid;
  }
`

export const WorkspaceSwitcherWrap = styled.div`
  position: relative;
  margin: 16px 12px 8px;
`

export const WorkspaceSwitcherIcon = styled.span`
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: #202337;
  font-size: 12px;
  font-weight: 700;
`

export const WorkspaceSwitcherCopy = styled.span<{ $collapsed: boolean }>`
  display: ${({ $collapsed }) => ($collapsed ? 'none' : 'flex')};
  min-width: 0;
  flex: 1;
  flex-direction: column;

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 10px;
    line-height: 1.2;
  }

  strong {
    overflow: hidden;
    font-size: 12px;
    line-height: 1.4;
    text-overflow: ellipsis;
  }
`

export const WorkspaceSwitcher = styled.button<{ $collapsed: boolean }>`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  gap: 10px;
  padding: ${({ $collapsed }) => ($collapsed ? '8px' : '9px')};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.text};
  background: ${({ theme }) => theme.surfaceSubtle};
  text-align: left;
  transition: border-color 150ms, background 150ms;

  &:hover {
    border-color: ${({ theme }) => theme.borderStrong};
    background: #fff;
  }

  ${({ $collapsed }) =>
    $collapsed &&
    css`
      & > svg {
        display: none;
      }
    `}
`

export const SidebarNav = styled.nav`
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 12px;
  overflow-y: auto;
`

export const SectionLabel = styled.span<{ $second?: boolean; $collapsed: boolean }>`
  padding: 10px 10px 7px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  margin-top: ${({ $second }) => ($second ? '15px' : '0')};
  display: ${({ $collapsed }) => ($collapsed ? 'none' : 'block')};
`

const navItemStyles = css<{ $active?: boolean; $collapsed?: boolean }>`
  position: relative;
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  gap: 11px;
  margin: 2px 0;
  padding: ${({ $collapsed }) => ($collapsed ? '0' : '0 11px')};
  border-radius: 9px;
  color: ${({ $active, theme }) => ($active ? theme.primary : '#656d80')};
  background: ${({ $active, theme }) => ($active ? theme.primarySoft : 'transparent')};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  white-space: nowrap;
  transition: color 150ms, background 150ms;

  &:hover {
    color: ${({ $active, theme }) => ($active ? theme.primary : theme.text)};
    background: ${({ $active, theme }) => ($active ? theme.primarySoft : '#f7f7fa')};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      &::before {
        position: absolute;
        left: -12px;
        width: 3px;
        height: 22px;
        border-radius: 0 4px 4px 0;
        background: ${theme.primary};
        content: '';
      }
    `}

  ${({ $collapsed }) =>
    $collapsed &&
    css`
      & > span {
        display: none;
      }
    `}
`

export const NavItem = styled(NavLink)<{ $active: boolean; $collapsed: boolean }>`
  ${navItemStyles}
`

export const NavItemAnchor = styled.a<{ $collapsed: boolean }>`
  ${navItemStyles}
`

export const NavItemSpark = styled.span`
  margin-left: auto;
  padding: 2px 5px;
  border-radius: 5px;
  color: ${({ theme }) => theme.violet};
  background: ${({ theme }) => theme.violetSoft};
  font-size: 9px;
  font-weight: 700;
`

export const SidebarFooter = styled.div`
  padding: 12px;
  border-top: 1px solid ${({ theme }) => theme.border};
`

export const UsageCard = styled.div<{ $collapsed: boolean }>`
  padding: 11px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  background: #fafafe;
  display: ${({ $collapsed }) => ($collapsed ? 'none' : 'block')};
`

export const UsageCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 10px;

  strong {
    color: ${({ theme }) => theme.text};
  }
`

export const Progress = styled.div`
  height: 4px;
  margin: 8px 0 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7e8ef;
`

export const ProgressFill = styled.span`
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f46e5, #8b5cf6);
`

export const UsageCardHint = styled.small`
  color: ${({ theme }) => theme.textTertiary};
  font-size: 9px;
`

export const CollapseButton = styled.button<{ $collapsed: boolean }>`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  gap: 10px;
  margin-top: 8px;
  padding: 8px 10px;
  border: 0;
  color: ${({ theme }) => theme.textTertiary};
  background: transparent;
  font-size: 11px;

  &:hover {
    color: ${({ theme }) => theme.text};
  }

  ${({ $collapsed }) =>
    $collapsed &&
    css`
      span {
        display: none;
      }
    `}

  ${media.tablet} {
    display: none;
  }
`

export const Sidebar = styled.aside<{ $collapsed: boolean; $open: boolean }>`
  position: fixed;
  z-index: 40;
  inset: 0 auto 0 0;
  display: flex;
  width: ${({ $collapsed, theme }) =>
    $collapsed ? theme.sidebarCollapsed : theme.sidebarWidth};
  flex-direction: column;
  border-right: 1px solid #e9eaf0;
  background: #fff;
  transition: width 180ms ease, transform 180ms ease;

  ${media.tablet} {
    width: ${({ theme }) => theme.sidebarWidth};
    transform: ${({ $open }) => ($open ? 'translateX(0)' : 'translateX(-100%)')};
    box-shadow: ${({ theme }) => theme.shadowMd};
  }
`

export const Main = styled.div<{ $collapsed: boolean }>`
  min-width: 0;
  min-height: 100vh;
  margin-left: ${({ $collapsed, theme }) =>
    $collapsed ? theme.sidebarCollapsed : theme.sidebarWidth};
  transition: margin 180ms ease;

  ${media.tablet} {
    margin-left: 0;
  }
`

export const Topbar = styled.header`
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  height: ${({ theme }) => theme.topbarHeight};
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(14px);

  ${media.phone} {
    padding: 0 14px;
  }
`

export const TopbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const TopbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

export const ProfileButtonCopy = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 92px;

  strong {
    font-size: 11px;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
    text-transform: capitalize;
  }
`

export const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 7px 4px 4px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;

  &:hover {
    background: #f5f6f9;
  }

  ${media.phone} {
    ${ProfileButtonCopy},
    & > svg {
      display: none;
    }
  }
`

export const NotificationButton = styled(IconButton)`
  position: relative;
`

export const NotificationDot = styled.span`
  position: absolute;
  top: 7px;
  right: 7px;
  width: 6px;
  height: 6px;
  border: 1.5px solid #fff;
  border-radius: 50%;
  background: #ef4444;
`

export const PageContainer = styled.main`
  width: 100%;
  max-width: 1660px;
  margin: 0 auto;
  padding: 28px;

  ${media.phone} {
    padding: 18px 14px;
  }
`

export const PopoverWrap = styled.div`
  position: relative;
`

export const Popover = styled.div`
  position: absolute;
  z-index: 60;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadowMd};
  animation: ${popoverIn} 140ms ease both;
`

export const WorkspaceMenu = styled(Popover)`
  top: calc(100% + 6px);
  left: 0;
  width: 228px;
  padding: 6px;
`

export const WorkspaceOption = styled.button<{ $active?: boolean }>`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: ${({ $active }) => ($active ? '#f6f7fa' : 'transparent')};
  text-align: left;

  &:hover {
    background: #f6f7fa;
  }

  div {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 11px;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }
`

export const WorkspaceOptionIcon = styled.span`
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: #202337;
  font-size: 12px;
  font-weight: 700;
`

export const NotificationPanel = styled(Popover)`
  top: calc(100% + 11px);
  right: 0;
  width: 350px;

  ${media.phone} {
    position: fixed;
    top: 62px;
    right: 10px;
    left: 10px;
    width: auto;
  }
`

export const PopoverHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 15px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  > div {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  strong {
    font-size: 13px;
  }

  span {
    padding: 2px 6px;
    border-radius: 999px;
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
    font-size: 9px;
    font-weight: 600;
  }

  button {
    border: 0;
    color: ${({ theme }) => theme.primary};
    background: transparent;
    font-size: 10px;
  }
`

export const NotificationList = styled.div`
  padding: 5px;
`

export const NotificationItemDot = styled.span<{ $tone: string }>`
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  background: ${({ $tone, theme }) => {
    if ($tone === 'urgent') return theme.red
    if ($tone === 'success') return theme.emerald
    return theme.primary
  }};
`

export const NotificationItem = styled.button`
  display: grid;
  width: 100%;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: start;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;

  &:hover {
    background: #f7f8fb;
  }

  > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  strong {
    font-size: 11px;
  }

  small,
  time {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }
`

export const PopoverFooter = styled(NavLink)`
  display: block;
  padding: 10px;
  border-top: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.primary};
  font-size: 10px;
  font-weight: 600;
  text-align: center;
`

export const ProfileMenu = styled(Popover)`
  top: calc(100% + 8px);
  right: 0;
  width: 230px;
  padding: 6px;
`

export const ProfileMenuIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  strong {
    font-size: 11px;
  }

  small {
    overflow: hidden;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
    text-overflow: ellipsis;
  }
`

export const ProfileMenuLink = styled(NavLink)`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 11px;
  text-align: left;

  &:hover {
    background: #f6f7fa;
  }
`

export const ProfileMenuButton = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 11px;
  text-align: left;

  &:hover {
    background: #f6f7fa;
  }
`

export const MobileOverlay = styled.button`
  ${media.tablet} {
    position: fixed;
    z-index: 35;
    inset: 0;
    border: 0;
    background: rgba(24, 27, 40, 0.42);
  }
`
