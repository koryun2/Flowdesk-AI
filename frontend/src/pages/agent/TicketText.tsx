import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const ticketLink = /\[(FD-\d+)\]\((\/tickets\/[0-9a-fA-F-]{36})\)/

export function TicketText({ text }: { text: string }) {
  const parts = text.split(ticketLink)
  if (parts.length === 1) return text
  const nodes: ReactNode[] = []
  for (let index = 0; index < parts.length; ) {
    const plain = parts[index]
    if (plain) nodes.push(<Fragment key={`text-${index}`}>{plain}</Fragment>)
    const label = parts[index + 1]
    const href = parts[index + 2]
    if (label && href) {
      nodes.push(
        <Link key={href + index} to={href}>
          {label}
        </Link>,
      )
    }
    index += label ? 3 : 1
  }
  return nodes
}
