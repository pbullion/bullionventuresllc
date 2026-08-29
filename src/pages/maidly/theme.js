// Palette and type lifted from the app (`maidly/src/constants/colors.js`), so
// the store listing, this website and the app all read as one identity. Maidly
// is a platform rather than one business's app — there is no customer brand to
// borrow from, so this teal-and-amber palette IS the brand. Keep it in step
// with the app's colors.js and `maidly-web/src/styles.css`.
export const c = {
  teal: '#0F766E',
  tealDeep: '#0A544E',
  tealLight: '#14958B',
  cream: '#F6FAF9',
  card: '#FFFFFF',
  border: '#E2ECEA',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  text: '#1A2E2B',
  subtext: '#64807B',
};

export const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif";

export const shell = {
  page: { backgroundColor: c.cream, color: c.text, minHeight: '100%', fontFamily: SANS },
  header: {
    padding: '56px 24px 40px',
    textAlign: 'center',
    background: `linear-gradient(165deg, ${c.teal} 0%, ${c.tealDeep} 100%)`,
    borderBottom: `3px solid ${c.amber}`,
  },
  headerEmoji: { fontSize: 44, marginBottom: 14, display: 'block' },
  headerTitle: { fontSize: 34, fontWeight: 700, margin: '0 0 10px', color: c.card, letterSpacing: '-0.01em' },
  headerMeta: { fontSize: 14, color: c.amberSoft, margin: 0, fontWeight: 600 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.82)', margin: 0, lineHeight: 1.6 },
  content: { maxWidth: 720, margin: '0 auto', padding: '44px 24px 72px' },
  sectionTitle: { fontSize: 21, fontWeight: 700, color: c.teal, marginTop: 42, marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: 700, color: c.text, marginTop: 22, marginBottom: 6 },
  body: { fontSize: 15.5, color: c.subtext, lineHeight: 1.78, margin: '0 0 12px' },
  strong: { color: c.text, fontWeight: 700 },
  list: { paddingLeft: 20, margin: '8px 0 16px' },
  listItem: { fontSize: 15.5, color: c.subtext, lineHeight: 1.78, marginBottom: 6 },
  divider: { border: 'none', borderTop: `1px solid ${c.border}`, margin: '38px 0 0' },
  contactBox: {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: '20px 24px',
    marginTop: 16,
  },
  emailLink: { color: c.teal, textDecoration: 'none', fontWeight: 700 },
  backLink: { display: 'inline-block', marginTop: 40, fontSize: 14, color: c.teal, fontWeight: 600 },
};
