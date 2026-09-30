import { CheckCircle2, UsersRound } from 'lucide-react'
import { Avatar, SectionHeading } from '../../components/ui'
import type { User } from '../../types'
import {
  TeamCard as TeamCardShell,
  TeamList,
  TeamResolved,
  TeamRow,
} from './DashboardPage.styles'

type TeamMember = User & {
  active: number
  resolved: number
}

type TeamCardProps = {
  team: TeamMember[]
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <TeamCardShell>
      <SectionHeading>
        <div>
          <h2>Team workload</h2>
          <p>Current queue distribution</p>
        </div>
        <UsersRound size={18} />
      </SectionHeading>
      <TeamList>
        {team.map((member) => (
          <TeamRow key={member.id}>
            <Avatar size="sm" user={member} />
            <span>
              <strong>{member.name}</strong>
              <small>{member.active} active</small>
            </span>
            <TeamResolved>
              <CheckCircle2 size={14} />
              {member.resolved}
            </TeamResolved>
          </TeamRow>
        ))}
      </TeamList>
    </TeamCardShell>
  )
}
