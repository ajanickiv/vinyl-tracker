import { Component, signal, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AchievementsService } from '../../services/achievements.service';
import { DatabaseService } from '../../services/database.service';
import { PlaybackService } from '../../services/playback.service';
import {
  BadgeProgress,
  TierLevel,
  CoverageTierLevel,
  TIER_COLORS,
  isTieredBadge,
} from '../../models/achievement.model';
import { BADGE_ICONS } from '../../constants/badge-icons.constants';

@Component({
  selector: 'app-achievements-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievements-sheet.component.html',
  styleUrls: ['./achievements-sheet.component.scss'],
})
export class AchievementsSheetComponent implements OnInit, OnDestroy {
  badges = signal<BadgeProgress[]>([]);
  isLoading = signal(true);

  isOpen = input.required<boolean>();
  close = output<void>();

  private destroy$ = new Subject<void>();

  constructor(
    private achievementsService: AchievementsService,
    private db: DatabaseService,
    private playbackService: PlaybackService,
    private sanitizer: DomSanitizer,
  ) {}

  getBadgeIcon(badgeId: string): SafeHtml {
    const svg = BADGE_ICONS[badgeId as keyof typeof BADGE_ICONS] || BADGE_ICONS['collector'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  ngOnInit(): void {
    this.loadBadges();

    // Refresh badges when stats change (after a play)
    this.playbackService.statsUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadBadges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBackdropClick(): void {
    this.closeSheet();
  }

  closeSheet(): void {
    this.close.emit();
  }

  getUnlockedCount(): number {
    return this.badges().filter((b) => b.isUnlocked).length;
  }

  getTotalCount(): number {
    return this.badges().length;
  }

  /** Check if badge is tiered */
  isTiered(badge: BadgeProgress): boolean {
    return isTieredBadge(badge.badge);
  }

  /** Get tier display name for current tier */
  getTierName(badge: BadgeProgress): string {
    if (!badge.currentTier) return '';
    return badge.currentTier.name;
  }

  /** Get tier color for styling */
  getTierColor(badge: BadgeProgress): string {
    if (!badge.currentTier) return '';
    return TIER_COLORS[badge.currentTier.level as TierLevel | CoverageTierLevel] || '';
  }

  /** Get progress percentage toward next tier (or current if maxed) */
  getProgressPercentage(badge: BadgeProgress): number {
    if (!badge.nextTier) {
      // At max tier or non-tiered unlocked
      return badge.isUnlocked
        ? 100
        : Math.min(100, Math.round((badge.current / badge.required) * 100));
    }

    // Calculate progress to next tier
    const prevThreshold = badge.currentTier?.threshold ?? 0;
    const nextThreshold = badge.nextTier.threshold;
    const range = nextThreshold - prevThreshold;
    const progress = badge.current - prevThreshold;

    return Math.min(100, Math.round((progress / range) * 100));
  }

  /** Format progress text showing current/next tier threshold */
  formatProgress(badge: BadgeProgress): string {
    if (badge.isUnlocked && !badge.nextTier) {
      // At max tier
      return badge.currentTier ? `Max: ${badge.currentTier.name}` : 'Unlocked';
    }

    const target = badge.nextTier?.threshold ?? badge.required;
    return `${badge.current}/${target}`;
  }

  /** Get the next tier name for display */
  getNextTierName(badge: BadgeProgress): string {
    return badge.nextTier?.name ?? '';
  }

  /** Check if badge is at max tier */
  isMaxTier(badge: BadgeProgress): boolean {
    return badge.isUnlocked && !badge.nextTier && this.isTiered(badge);
  }

  private async loadBadges(): Promise<void> {
    this.isLoading.set(true);
    try {
      const releases = await this.db.getAllReleases();
      const progress = this.achievementsService.calculateAllProgress(releases);
      this.badges.set(progress);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
