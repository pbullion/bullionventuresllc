// Palette and type lifted from the app, which in turn takes them from
// southsideportneches.org — so the store listing, the website and the app all
// read as one identity.
export const c = {
  green: '#30574E',
  greenDeep: '#22403A',
  cream: '#FFF8EB',
  card: '#FFFFFF',
  border: '#E7DCC7',
  gold: '#E4C58A',
  goldSoft: '#F5E9D2',
  text: '#20302B',
  subtext: '#6E7A75',
};

export const SANS = "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const shell = {
  page: { backgroundColor: c.cream, color: c.text, minHeight: '100%', fontFamily: SANS },
  header: {
    padding: '56px 24px 40px',
    textAlign: 'center',
    background: `linear-gradient(165deg, ${c.green} 0%, ${c.greenDeep} 100%)`,
    borderBottom: `3px solid ${c.gold}`,
  },
  headerEmoji: { fontSize: 44, marginBottom: 14, display: 'block' },
  headerTitle: { fontSize: 34, fontWeight: 700, margin: '0 0 10px', color: c.cream, letterSpacing: '-0.01em' },
  headerMeta: { fontSize: 14, color: c.gold, margin: 0, fontWeight: 600 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,248,235,0.82)', margin: 0, lineHeight: 1.6 },
  content: { maxWidth: 720, margin: '0 auto', padding: '44px 24px 72px' },
  sectionTitle: { fontSize: 21, fontWeight: 700, color: c.green, marginTop: 42, marginBottom: 12 },
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
  emailLink: { color: c.green, textDecoration: 'none', fontWeight: 700 },
  backLink: { display: 'inline-block', marginTop: 40, fontSize: 14, color: c.green, fontWeight: 600 },
};
