import {
  Building2,
  Edit3,
  MessageSquare,
} from 'lucide-react'
import {
  Avatar,
  Button,
  ButtonAnchor,
} from '../../components/ui'
import type { Customer } from '../../types'
import {
  HealthBadge,
  HeroActions,
  HeroCard,
  HeroIdentity,
  HeroName,
} from './CustomerDetailPage.styles'

type CustomerHeroProps = {
  customer: Customer
  onEdit: () => void
}

export function CustomerHero({ customer, onEdit }: CustomerHeroProps) {
  return (
    <HeroCard>
      <HeroIdentity>
        <Avatar
          initials={customer.initials}
          name={customer.name}
          size="lg"
        />
        <div>
          <HeroName>
            <h1>{customer.name}</h1>
            <HealthBadge $health={customer.health}>
              <i /> {customer.health.replace('_', ' ')}
            </HealthBadge>
          </HeroName>
          <p>
            <Building2 size={15} /> {customer.company}
            <span>·</span>
            {customer.plan} plan
          </p>
        </div>
      </HeroIdentity>
      <HeroActions>
        <ButtonAnchor $variant="secondary" href={`mailto:${customer.email}`}>
          <MessageSquare size={17} /> Send message
        </ButtonAnchor>
        <Button icon={Edit3} onClick={onEdit}>
          Edit customer
        </Button>
      </HeroActions>
    </HeroCard>
  )
}
