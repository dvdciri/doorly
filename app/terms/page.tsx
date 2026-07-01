import type { Metadata } from 'next'
import LegalDocumentPage from '../components/LegalDocumentPage'
import { termsContent } from '../data/legal-documents'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Doorly Properties',
  description: 'Terms and conditions for the Doorly Properties free cash offer campaign.',
}

export default function TermsPage() {
  return (
    <LegalDocumentPage title="Terms & Conditions" content={termsContent} />
  )
}
