import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { legalDocumentLinks, legalDocuments, type LegalDocument } from '@/lib/legal-documents';
import { getLegalContactEmail, LEGAL_LAST_UPDATED } from '@/lib/legal-site';

const VALID_SLUGS = ['privacy', 'terms', 'cookies'] as const;

function isValidSlug(slug: string): slug is LegalDocument['slug'] {
  return (VALID_SLUGS as readonly string[]).includes(slug);
}

export default function LegalDocumentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const resolvedSlug = Array.isArray(slug) ? slug[0] : slug;
  const { copy, language } = useLanguage();
  const router = useRouter();
  const contactEmail = getLegalContactEmail();
  const { scrollContentStyle, horizontal } = useScreenInsets();

  if (!resolvedSlug || !isValidSlug(resolvedSlug)) {
    return (
      <Screen safeBottom>
        <Text style={styles.title}>{copy('legalNotFound')}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>{copy('back')}</Text>
        </Pressable>
      </Screen>
    );
  }

  const document = legalDocuments[resolvedSlug];
  const otherLinks = legalDocumentLinks.filter((entry) => entry.slug !== document.slug);

  return (
    <Screen scroll={false} safeBottom padded={false}>
      <View style={[styles.header, { paddingHorizontal: horizontal }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>{copy('back')}</Text>
        </Pressable>
        <Text style={styles.updated}>
          {copy('legalUpdated')} {LEGAL_LAST_UPDATED}
        </Text>
      </View>

      <ScrollView contentContainerStyle={scrollContentStyle}>
        <Text style={styles.title}>{document.title[language]}</Text>
        <Text style={styles.description}>{document.description[language]}</Text>

        <View style={styles.card}>
          {document.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title[language]}</Text>
              {section.paragraphs.map((paragraph, index) => (
                <Text key={`${section.id}-${index}`} style={styles.paragraph}>
                  {paragraph[language]}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {copy('legalSeeAlso')}{' '}
            {otherLinks.map((entry, index) => (
              <Text key={entry.slug}>
                <Link href={{ pathname: '/legal/[slug]', params: { slug: entry.slug } }} style={styles.footerLink}>
                  {entry.label[language]}
                </Link>
                {index < otherLinks.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Text>
          {contactEmail ? (
            <Text style={styles.footerLink}>{contactEmail}</Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
  },
  back: {
    color: colors.primaryLight,
    fontWeight: '600',
    fontSize: 15,
  },
  updated: {
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  paragraph: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    gap: 8,
    marginTop: 4,
  },
  footerText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  footerLink: {
    color: colors.primaryLight,
    fontWeight: '600',
    fontSize: 14,
  },
  link: {
    color: colors.primaryLight,
    fontWeight: '600',
    marginTop: 12,
  },
});