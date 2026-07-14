import { LegalDocumentPage } from '@/components/legal/legal-document-page';
import { termsOfUseDocument } from '@/lib/legal-documents';

export default function TermsOfUsePage() {
  return <LegalDocumentPage document={termsOfUseDocument} />;
}