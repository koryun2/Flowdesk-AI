import { MessageSquare, Send, Tag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, Button } from '../../components/ui'
import { formatDate, formatRelative } from '../../lib/utils'
import type { Customer, Ticket } from '../../types'
import {
  Comment,
  CommentContent,
  Conversation,
  ConversationEmpty,
  ReplyBox,
  ReplyBoxTab,
  ReplyBoxTabs,
  TicketContentCard,
  TicketDescription,
  TicketDescriptionAuthor,
  TicketTags,
} from './TicketDetailPage.styles'

export function TicketConversation({
  ticket,
  customer,
  reply,
  isInternal,
  addingTag,
  tagName,
  commentPending,
  showThread,
  tabs,
  onReplyChange,
  onInternalChange,
  onSend,
  onAddTagClick,
  onTagNameChange,
  onTagSubmit,
}: {
  ticket: Ticket
  customer:
    | Pick<Customer, 'id' | 'name' | 'email' | 'company' | 'initials' | 'plan'>
    | undefined
  reply: string
  isInternal: boolean
  addingTag: boolean
  tagName: string
  commentPending: boolean
  showThread: boolean
  tabs: ReactNode
  onReplyChange: (value: string) => void
  onInternalChange: (value: boolean) => void
  onSend: () => void
  onAddTagClick: () => void
  onTagNameChange: (value: string) => void
  onTagSubmit: (name: string) => void
}) {
  return (
    <>
      <TicketContentCard>
        <TicketDescriptionAuthor>
          <Avatar
            initials={customer?.initials}
            name={customer?.name}
            size="md"
          />
          <span>
            <strong>{customer?.name}</strong>
            <small>{customer?.email}</small>
          </span>
          <time>
            {formatDate(ticket.createdAt, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
        </TicketDescriptionAuthor>
        <TicketDescription>
          <p>{ticket.description}</p>
        </TicketDescription>
        <TicketTags>
          {ticket.tags.map((tag) => (
            <span key={tag.id}>
              <i style={{ backgroundColor: tag.color }} />
              {tag.name}
            </span>
          ))}
          <button onClick={onAddTagClick} type="button">
            <Tag size={13} /> Add tag
          </button>
          {addingTag ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                const name = tagName.trim()
                if (!name) return
                onTagSubmit(name)
              }}
            >
              <input
                aria-label="Tag name"
                onChange={(event) => onTagNameChange(event.target.value)}
                value={tagName}
              />
            </form>
          ) : null}
        </TicketTags>
      </TicketContentCard>

      {tabs}

      {showThread ? (
        <Conversation>
          {ticket.comments.length ? (
            ticket.comments.map((comment) => (
              <Comment $internal={comment.isInternal} key={comment.id}>
                <Avatar size="sm" user={comment.author} />
                <CommentContent>
                  <header>
                    <strong>{comment.author.name}</strong>
                    {comment.isInternal ? <span>Internal note</span> : null}
                    <time>{formatRelative(comment.createdAt)}</time>
                  </header>
                  <p>{comment.body}</p>
                </CommentContent>
              </Comment>
            ))
          ) : (
            <ConversationEmpty>
              <MessageSquare size={20} />
              <strong>No replies yet</strong>
              <span>Start the conversation below.</span>
            </ConversationEmpty>
          )}

          <ReplyBox $internal={isInternal}>
            <ReplyBoxTabs>
              <ReplyBoxTab
                $active={!isInternal}
                $internalMode={false}
                onClick={() => onInternalChange(false)}
                type="button"
              >
                Reply to customer
              </ReplyBoxTab>
              <ReplyBoxTab
                $active={isInternal}
                $internalMode={isInternal}
                onClick={() => onInternalChange(true)}
                type="button"
              >
                Internal note
              </ReplyBoxTab>
            </ReplyBoxTabs>
            <textarea
              aria-label={isInternal ? 'Internal note' : 'Reply to customer'}
              onChange={(event) => onReplyChange(event.target.value)}
              placeholder={
                isInternal
                  ? 'Share context with your team…'
                  : `Reply to ${customer?.name ?? 'customer'}…`
              }
              rows={5}
              value={reply}
            />
            <footer>
              <span>
                {isInternal
                  ? 'Only visible to your team'
                  : `Sending from support@flowdesk.ai`}
              </span>
              <Button
                disabled={!reply.trim() || commentPending}
                icon={Send}
                onClick={onSend}
                size="sm"
              >
                {commentPending
                  ? 'Sending…'
                  : isInternal
                    ? 'Add note'
                    : 'Send reply'}
              </Button>
            </footer>
          </ReplyBox>
        </Conversation>
      ) : null}
    </>
  )
}
