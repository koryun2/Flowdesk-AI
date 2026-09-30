import {
  Building2,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { Avatar } from '../../components/ui'
import type { Customer } from '../../types'
import {
  AccountOwnerCard,
  ContactList,
  DetailSidebar,
  NotesCard,
  NotesHeader,
  SidebarCard,
} from './CustomerDetailPage.styles'

type CustomerSidebarProps = {
  customer: Customer
  onEdit: () => void
}

export function CustomerSidebar({ customer, onEdit }: CustomerSidebarProps) {
  return (
    <DetailSidebar>
      <SidebarCard>
        <h3>Contact information</h3>
        <ContactList>
          <div>
            <dt>
              <Mail size={15} /> Email
            </dt>
            <dd>{customer.email}</dd>
          </div>
          <div>
            <dt>
              <Phone size={15} /> Phone
            </dt>
            <dd>{customer.phone || 'Not provided'}</dd>
          </div>
          <div>
            <dt>
              <Building2 size={15} /> Company
            </dt>
            <dd>{customer.company}</dd>
          </div>
          <div>
            <dt>
              <MapPin size={15} /> Timezone
            </dt>
            <dd>Not recorded</dd>
          </div>
        </ContactList>
      </SidebarCard>
      <NotesCard>
        <NotesHeader>
          <h3>Internal notes</h3>
          <button onClick={onEdit} type="button">
            Edit
          </button>
        </NotesHeader>
        <p>{customer.notes || 'No internal notes added.'}</p>
        <small>Visible only to your team</small>
      </NotesCard>
      <AccountOwnerCard>
        <h3>Account owner</h3>
        <div>
          <Avatar
            name="Nora Patel"
            initials="NP"
            size="sm"
          />
          <span>
            <strong>Nora Patel</strong>
            <small>Customer success</small>
          </span>
        </div>
      </AccountOwnerCard>
    </DetailSidebar>
  )
}
