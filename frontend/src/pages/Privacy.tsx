import { LegalPage } from '../components/legal/LegalPage'
import { PrivacyContent, PRIVACY_LAST_UPDATED } from '../components/legal/PrivacyContent'

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="Learn how Visualize collects, uses, and safeguards your business and telemetry data."
      lastUpdated={PRIVACY_LAST_UPDATED}
    >
      <PrivacyContent />
    </LegalPage>
  )
}
