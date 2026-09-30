import { Settings2 } from 'lucide-react'
import { ButtonLink } from '../../components/ui'
import { NotFound } from './styles'

export function NotFoundPage() {
  return (
    <NotFound>
      <span>
        <Settings2 size={28} />
      </span>
      <small>404</small>
      <h1>That page isn’t in this workspace</h1>
      <p>The link may be outdated, or the resource may have moved.</p>
      <ButtonLink to="/">Return to dashboard</ButtonLink>
    </NotFound>
  )
}
