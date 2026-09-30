import { Check, Sparkles, WandSparkles } from 'lucide-react'
import {
  AuthBrand,
  AuthKicker,
  AuthProofCard,
  AuthProofMetric,
  AuthShowcase as Showcase,
  ShowcaseContent,
} from './AuthPage.styles'

export function AuthShowcase() {
  return (
    <Showcase>
      <AuthBrand to="/">
        <span>
          <Sparkles size={20} />
        </span>
        Flowdesk <strong>AI</strong>
      </AuthBrand>
      <ShowcaseContent>
        <AuthKicker>
          <WandSparkles size={15} /> AI-native product operations
        </AuthKicker>
        <h1>Turn every customer signal into clear action.</h1>
        <p>
          Triage requests, find answers, and run support operations from one
          intelligent workspace.
        </p>
        <ul>
          <li>
            <Check size={17} /> Structured ticket analysis
          </li>
          <li>
            <Check size={17} /> Source-cited knowledge answers
          </li>
          <li>
            <Check size={17} /> Human-approved agent actions
          </li>
        </ul>
      </ShowcaseContent>
      <AuthProofCard>
        <AuthProofMetric>
          <span>47%</span>
          <small>AI resolution rate</small>
        </AuthProofMetric>
        <AuthProofMetric>
          <span>18m</span>
          <small>Average response</small>
        </AuthProofMetric>
        <AuthProofMetric>
          <span>94.8%</span>
          <small>Customer satisfaction</small>
        </AuthProofMetric>
      </AuthProofCard>
    </Showcase>
  )
}
