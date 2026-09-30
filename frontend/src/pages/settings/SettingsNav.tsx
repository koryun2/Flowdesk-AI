import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  SettingsNav as Nav,
  SettingsNavButton,
} from './styles'

type SettingsNavProps = {
  tabs: Array<{ id: string; label: string; icon: LucideIcon }>
  active: string
  onChange: (id: string) => void
}

export function SettingsNav({ tabs, active, onChange }: SettingsNavProps) {
  return (
    <Nav>
      {tabs.map(({ id, label, icon: Icon }) => (
        <SettingsNavButton
          $active={active === id}
          key={id}
          onClick={() => onChange(id)}
          type="button"
        >
          <Icon size={17} /> {label}
          <ChevronRight size={14} />
        </SettingsNavButton>
      ))}
    </Nav>
  )
}
