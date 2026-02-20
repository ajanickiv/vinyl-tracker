import { Component, computed, signal, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AchievementsService } from '../achievements.service';
import { DatabaseService } from '../../../core/database.service';
import { PlaybackService } from '../../player/playback.service';
import {
  BadgeProgress,
  TierLevel,
  CoverageTierLevel,
  TIER_COLORS,
  isTieredBadge,
} from '../achievement.model';
import { BADGE_ICONS } from '../badge-icons.constants';

/** BadgeProgress enriched with pre-computed display values */
export interface BadgeViewModel extends BadgeProgress {
  tierColor: string;
  tierName: string;
  nextTierName: string;
  progressPercentage: number;
  formattedProgress: string;
  tiered: boolean;
  maxTier: boolean;
  icon: SafeHtml;
}

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

  badgeViewModels = computed(() => this.badges().map((b) => this.toBadgeViewModel(b)));
  unlockedCount = computed(() => this.badges().filter((b) => b.isUnlocked).length);
  totalCount = computed(() => this.badges().length);

  private destroy$ = new Subject<void>();

  constructor(
    private achievementsService: AchievementsService,
    private db: DatabaseService,
    private playbackService: PlaybackService,
    private sanitizer: DomSanitizer,
  ) {}

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

  /** Get progress percentage toward next tier (or current if maxed) */
  getProgressPercentage(badge: BadgeProgress): number {
    if (!badge.nextTier) {
      return badge.isUnlocked
        ? 100
        : Math.min(100, Math.round((badge.current / badge.required) * 100));
    }

    const prevThreshold = badge.currentTier?.threshold ?? 0;
    const nextThreshold = badge.nextTier.threshold;
    const range = nextThreshold - prevThreshold;
    const progress = badge.current - prevThreshold;

    return Math.min(100, Math.round((progress / range) * 100));
  }

  /** Format progress text showing current/next tier threshold */
  formatProgress(badge: BadgeProgress): string {
    if (badge.isUnlocked && !badge.nextTier) {
      return badge.currentTier ? `Max: ${badge.currentTier.name}` : 'Unlocked';
    }

    const target = badge.nextTier?.threshold ?? badge.required;
    return `${badge.current}/${target}`;
  }

  /** Check if badge is tiered */
  isTiered(badge: BadgeProgress): boolean {
    return isTieredBadge(badge.badge);
  }

  /** Check if badge is at max tier */
  isMaxTier(badge: BadgeProgress): boolean {
    return badge.isUnlocked && !badge.nextTier && this.isTiered(badge);
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

  /** Get the next tier name for display */
  getNextTierName(badge: BadgeProgress): string {
    return badge.nextTier?.name ?? '';
  }

  private toBadgeViewModel(badge: BadgeProgress): BadgeViewModel {
    const badgeId = badge.badge.id;
    const svg = BADGE_ICONS[badgeId as keyof typeof BADGE_ICONS] || BADGE_ICONS['collector'];

    return {
      ...badge,
      tierColor: this.getTierColor(badge),
      tierName: this.getTierName(badge),
      nextTierName: this.getNextTierName(badge),
      progressPercentage: this.getProgressPercentage(badge),
      formattedProgress: this.formatProgress(badge),
      tiered: this.isTiered(badge),
      maxTier: this.isMaxTier(badge),
      icon: this.sanitizer.bypassSecurityTrustHtml(svg),
    };
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
