import styled, { css } from 'styled-components'
import type { User } from '../../types'

const AvatarFace = styled.span<{ $size: 'xs' | 'sm' | 'md' | 'lg'; $empty: boolean }>`
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  background: #697083;
  font-weight: 700;
  letter-spacing: -0.02em;

  ${({ $size }) => {
    if ($size === 'xs') return 'width: 25px; height: 25px; font-size: 8px;'
    if ($size === 'sm') return 'width: 32px; height: 32px; font-size: 9px;'
    if ($size === 'lg') return 'width: 58px; height: 58px; font-size: 15px;'
    return 'width: 40px; height: 40px; font-size: 11px;'
  }}

  ${({ $empty }) =>
    $empty &&
    css`
      color: #858b9a;
      background: #ebecef;
    `}
`

export function Avatar({
  user,
  name,
  initials,
  size = 'md',
}: {
  user?: User | null
  name?: string
  initials?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const label = user?.name ?? name ?? 'Unassigned'
  const displayInitials =
    user?.initials ??
    initials ??
    label
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  return (
    <AvatarFace
      $empty={!user && !name}
      $size={size}
      aria-label={label}
      style={user ? { backgroundColor: user.color } : undefined}
      title={label}
    >
      {displayInitials}
    </AvatarFace>
  )
}
