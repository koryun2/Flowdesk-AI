import { CircleUserRound, ExternalLink, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui'
import type { Customer } from '../../types'
import {
  CustomerSummaryCard,
  CustomerSummaryDetails,
  CustomerSummaryIdentity,
} from './TicketDetailPage.styles'

export function TicketCustomerCard({
  customer,
}: {
  customer:
    | Pick<Customer, 'id' | 'name' | 'email' | 'company' | 'initials' | 'plan'>
    | undefined
}) {
  return (
    <CustomerSummaryCard>
      <CustomerSummaryIdentity>
        <Avatar
          initials={customer?.initials}
          name={customer?.name}
          size="lg"
        />
        <div>
          <strong>{customer?.name}</strong>
          <span>{customer?.company}</span>
        </div>
      </CustomerSummaryIdentity>
      <CustomerSummaryDetails>
        <span>
          <Mail size={14} /> {customer?.email}
        </span>
        <span>
          <CircleUserRound size={14} /> {customer?.plan} plan
        </span>
      </CustomerSummaryDetails>
      <Link to={`/customers/${customer?.id}`}>
        View customer profile <ExternalLink size={13} />
      </Link>
    </CustomerSummaryCard>
  )
}
