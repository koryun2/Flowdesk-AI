import { Send, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { Button, Skeleton } from '../../components/ui'
import type { KnowledgeAnswer as KnowledgeAnswerData } from '../../types'
import {
  AnswerLabel,
  AnswerLoading,
  AskCard,
  AskIntro,
  Citation,
  CitationList,
  KnowledgeAnswer,
  QuestionForm,
  QuestionInput,
} from './KnowledgePage.styles'

type KnowledgeAskProps = {
  question: string
  onQuestionChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  isPending: boolean
  answer: KnowledgeAnswerData | undefined
  submittedQuestion: string
  onCitationClick: (title: string) => void
}

export function KnowledgeAsk({
  question,
  onQuestionChange,
  onSubmit,
  isPending,
  answer,
  submittedQuestion,
  onCitationClick,
}: KnowledgeAskProps) {
  return (
    <AskCard>
      <AskIntro>
        <span>
          <Sparkles size={19} />
        </span>
        <div>
          <h2>Ask your knowledge base</h2>
          <p>Answers are grounded in indexed sources and include citations.</p>
        </div>
      </AskIntro>
      <QuestionForm onSubmit={onSubmit}>
        <QuestionInput
          aria-label="Ask your knowledge base"
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="How should customers export datasets over 50,000 rows?"
          value={question}
        />
        <Button disabled={!question.trim() || isPending} icon={Send} type="submit">
          {isPending ? 'Searching…' : 'Ask'}
        </Button>
      </QuestionForm>

      {isPending ? (
        <AnswerLoading>
          <Skeleton $height="10px" $width="95%" />
          <Skeleton $height="10px" $width="75%" />
          <Skeleton $height="10px" $width="55%" />
        </AnswerLoading>
      ) : answer ? (
        <KnowledgeAnswer>
          <AnswerLabel>
            <Sparkles size={15} /> Answer
          </AnswerLabel>
          <h3>{submittedQuestion}</h3>
          <p>{answer.answer}</p>
          <CitationList>
            <span>Sources</span>
            {answer.sources.map((source, index) => (
              <Citation
                key={source.documentId}
                onClick={() => onCitationClick(source.title)}
                type="button"
              >
                <strong>{index + 1}</strong>
                <span>
                  <b>{source.title}</b>
                  <small>{source.excerpt}</small>
                </span>
                <em>{Math.round(source.relevance * 100)}%</em>
              </Citation>
            ))}
          </CitationList>
        </KnowledgeAnswer>
      ) : null}
    </AskCard>
  )
}
