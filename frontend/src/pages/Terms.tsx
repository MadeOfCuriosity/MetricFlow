import { LegalPage } from '../components/legal/LegalPage'
import { TermsContent, TERMS_LAST_UPDATED } from '../components/legal/TermsContent'

export default function Terms() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="Review the terms and conditions governing the use of the Visualize platform and services."
      lastUpdated={TERMS_LAST_UPDATED}
    >
      <TermsContent />
    </LegalPage>
  )
}
