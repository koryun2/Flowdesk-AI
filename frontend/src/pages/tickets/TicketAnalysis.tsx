import { Bot, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui'
import { formatRelative } from '../../lib/utils'
import type { Ticket } from '../../types'
import {
  AiAnalysisCard,
  AiModel,
  Sentiment,
  SuggestedTags,
} from './TicketDetailPage.styles'

export function TicketAnalysis({
  ticket,
  analyzePending,
  tagPending,
  onRetryAnalyze,
  onApplyTag,
}: {
  ticket: Ticket
  analyzePending: boolean
  tagPending: boolean
  onRetryAnalyze: () => void
  onApplyTag: (tag: string) => void
}) {
  if (ticket.analysis) {
    return (
      <AiAnalysisCard>
        <header>
          <span>
            <Sparkles size={16} /> AI analysis
          </span>
          <small>{Math.round(ticket.analysis.confidence * 100)}% confidence</small>
        </header>
        <p>{ticket.analysis.summary}</p>
        <dl>
          <div>
            <dt>Category</dt>
            <dd>{ticket.analysis.category.replaceAll('_', ' ')}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{ticket.analysis.priority}</dd>
          </div>
          <div>
            <dt>Sentiment</dt>
            <Sentiment $sentiment={ticket.analysis.sentiment}>
              {ticket.analysis.sentiment}
            </Sentiment>
          </div>
        </dl>
        {ticket.analysis.suggestedTags.length ? (
          <SuggestedTags>
            <span>Suggested tags</span>
            <div>
              {ticket.analysis.suggestedTags.map((tag) => {
                const applied = ticket.tags.some(
                  (item) => item.name.toLowerCase() === tag.toLowerCase(),
                )
                return (
                  <button
                    disabled={applied || tagPending}
                    key={tag}
                    onClick={() => onApplyTag(tag)}
                    type="button"
                  >
                    {applied ? tag : `+ ${tag}`}
                  </button>
                )
              })}
            </div>
          </SuggestedTags>
        ) : null}
        <AiModel>
          <Bot size={13} /> {ticket.analysis.modelName} ·{' '}
          {formatRelative(ticket.analysis.createdAt)}
        </AiModel>
      </AiAnalysisCard>
    )
  }

  return (
    <AiAnalysisCard $pending>
      <Sparkles size={18} />
      <strong>{ticket.analysisError ? 'Analysis failed' : 'Not analyzed'}</strong>
      <p>
        {ticket.analysisError
          ? 'Flowdesk AI could not classify this ticket. You can run it again.'
          : 'Automatic analysis is off. Run it when you want a classification.'}
      </p>
      <Button
        disabled={analyzePending}
        onClick={onRetryAnalyze}
        size="sm"
        variant="secondary"
      >
        {analyzePending ? 'Analyzing…' : ticket.analysisError ? 'Try again' : 'Analyze ticket'}
      </Button>
    </AiAnalysisCard>
  )
}
