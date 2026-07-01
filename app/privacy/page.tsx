import type { Metadata } from 'next'
import LegalDocumentPage from '../components/LegalDocumentPage'
import { privacyContent } from '../data/legal-documents'

export const metadata: Metadata = {
  title: 'Privacy Policy | Doorly Properties',
  description: 'Privacy policy for the Doorly Properties free cash offer campaign.',
}

export default function PrivacyPage() {
  return (
    <LegalDocumentPage title="Privacy Policy" content={privacyContent} />
  )
}
