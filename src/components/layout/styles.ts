import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

/**
 * Hebrew-first layout primitives.
 *
 * All horizontal layouts use `row-reverse` so the first child
 * renders on the RIGHT (the natural start in Hebrew).
 * No I18nManager — RTL is structural, not system-driven.
 */

const cardBg = 'rgba(255, 255, 255, 0.95)';
const borderColor = 'rgba(0, 0, 0, 0.08)';

export const layout = StyleSheet.create({
  // ── Screen shells ──────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // ── Rows ───────────────────────────────────────────
  /** Standard horizontal row — first child on RIGHT */
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  /** Row with space-between (title RIGHT, action LEFT) */
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Section ────────────────────────────────────────
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ── Cards ──────────────────────────────────────────
  card: {
    backgroundColor: cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List items ─────────────────────────────────────
  /** Row: [Icon ← Content ← Disclosure chevron] */
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor,
    padding: 14,
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  listItemContent: {
    flex: 1,
    alignItems: 'flex-end',
  },

  // ── KPI grid ───────────────────────────────────────
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor,
    padding: 16,
    alignItems: 'flex-end',
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  // ── Progress bars ──────────────────────────────────
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressBarThin: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden' as const,
  },
  progressFillThin: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Empty state ────────────────────────────────────
  emptyState: {
    backgroundColor: cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  // ── Search ─────────────────────────────────────────
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
  },

  // ── Loading skeletons ──────────────────────────────
  skeletonCard: {
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
  },
  skeletonCardTall: {
    height: 140,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
  },
});

export const typography = StyleSheet.create({
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
    color: colors.neutral[900],
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 15,
    textAlign: 'right',
    color: colors.neutral[500],
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[600],
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    color: colors.neutral[900],
  },
  body: {
    fontSize: 14,
    color: colors.neutral[700],
  },
  caption: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  kpiLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.neutral[500],
  },
});
