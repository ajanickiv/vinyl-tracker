import { BadgeId } from './achievement.model';

/**
 * SVG icons for achievement badges.
 * 7 badges total after tiered system consolidation.
 */
export const BADGE_ICONS: Record<BadgeId, string> = {
  // Collection badge - vinyl record with grooves
  collector: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="12" cy="12" r="3"/></svg>`,

  // Total plays badge - play button
  spins: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>`,

  // Coverage badge - star (completion/achievement)
  coverage: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,

  // Genre explorer badge - compass
  'genre-explorer': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>`,

  // Decade hopper badge - globe
  'decade-hopper': `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1"/><ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" stroke-width="1" fill="none"/></svg>`,

  // Artist devotion badge - heart
  devotion: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

  // Album favorite badge - repeat/loop
  favorite: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
};
