import { LegalDocumentPage } from '@/components/legal/legal-document-page';
import { cookiePolicyDocument } from '@/lib/legal-documents';

export default function CookiePolicyPage() {
  return <LegalDocumentPage document={cookiePolicyDocument} />;
}