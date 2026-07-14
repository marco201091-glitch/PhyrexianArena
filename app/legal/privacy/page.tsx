import { LegalDocumentPage } from '@/components/legal/legal-document-page';
import { privacyPolicyDocument } from '@/lib/legal-documents';

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage document={privacyPolicyDocument} />;
}