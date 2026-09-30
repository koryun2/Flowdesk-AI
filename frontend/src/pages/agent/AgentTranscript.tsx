import {
  ArrowRight,
  Bot,
  Send,
  Sparkles,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { Avatar, Button } from '../../components/ui'
import type { AgentMessage, User } from '../../types'
import { AgentToolCall } from './AgentToolCall'
import { TicketText } from './TicketText'
import {
  AgentAvatar,
  AgentComposer,
  AgentComposerWrap,
  AgentConsole,
  AgentConsoleHeader,
  AgentDisclaimer,
  AgentMessageAuthor,
  AgentMessageBody,
  AgentMessageBubble,
  AgentMessageRow,
  AgentMessages,
  AgentThinking,
  OnlineDot,
  PromptSuggestions,
  ToolCallList,
} from './AgentPage.styles'

const prompts = [
  'Find unresolved export bugs',
  'Summarize urgent tickets from today',
  'Which customers are at risk?',
  'Search docs for API rate limits',
]

type AgentTranscriptProps = {
  messages: AgentMessage[]
  profile: User | null
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onSend: (value: string) => void
  isPending: boolean
  decisionPending: boolean
  onDecide: (id: string, choice: 'approve' | 'cancel') => void
}

export function AgentTranscript({
  messages,
  profile,
  prompt,
  onPromptChange,
  onSubmit,
  onSend,
  isPending,
  decisionPending,
  onDecide,
}: AgentTranscriptProps) {
  return (
    <AgentConsole>
      <AgentConsoleHeader>
        <AgentAvatar>
          <Sparkles size={18} />
        </AgentAvatar>
        <div>
          <strong>Flowdesk Agent</strong>
          <span>
            <OnlineDot /> Online · 6 tools available
          </span>
        </div>
      </AgentConsoleHeader>

      <AgentMessages aria-live="polite">
        {messages.map((message) => (
          <AgentMessageRow $role={message.role} key={message.id}>
            {message.role === 'assistant' ? (
              <AgentAvatar $size="sm">
                <Bot size={16} />
              </AgentAvatar>
            ) : (
              <Avatar initials={profile?.initials} name={profile?.name} size="sm" />
            )}
            <AgentMessageBody $role={message.role}>
              <AgentMessageAuthor>
                {message.role === 'assistant' ? 'Flowdesk Agent' : profile?.name ?? 'You'}
              </AgentMessageAuthor>
              <AgentMessageBubble $role={message.role}>
                <p>
                  <TicketText text={message.content} />
                </p>
              </AgentMessageBubble>
              {message.toolCalls?.length ? (
                <ToolCallList>
                  {message.toolCalls.map((tool) => (
                    <AgentToolCall
                      decisionPending={decisionPending}
                      key={tool.id}
                      onDecide={onDecide}
                      tool={tool}
                    />
                  ))}
                </ToolCallList>
              ) : null}
            </AgentMessageBody>
          </AgentMessageRow>
        ))}

        {isPending ? (
          <AgentMessageRow $role="assistant">
            <AgentAvatar $size="sm">
              <Bot size={16} />
            </AgentAvatar>
            <AgentThinking>
              <span />
              <span />
              <span />
              Searching workspace
            </AgentThinking>
          </AgentMessageRow>
        ) : null}
      </AgentMessages>

      <AgentComposerWrap>
        {messages.length === 1 ? (
          <PromptSuggestions>
            {prompts.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSend(suggestion)}
                type="button"
              >
                {suggestion} <ArrowRight size={13} />
              </button>
            ))}
          </PromptSuggestions>
        ) : null}
        <AgentComposer onSubmit={onSubmit}>
          <textarea
            aria-label="Message Flowdesk Agent"
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSend(prompt)
              }
            }}
            placeholder="Ask about tickets, customers, or knowledge…"
            rows={2}
            value={prompt}
          />
          <div>
            <span>
              <Sparkles size={13} /> Agent can use approved tools
            </span>
            <Button
              aria-label="Send message"
              disabled={!prompt.trim() || isPending}
              type="submit"
            >
              <Send size={16} />
            </Button>
          </div>
        </AgentComposer>
        <AgentDisclaimer>
          AI can make mistakes. Review proposed actions before approval.
        </AgentDisclaimer>
      </AgentComposerWrap>
    </AgentConsole>
  )
}
