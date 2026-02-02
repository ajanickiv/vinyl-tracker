import { Component, signal, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AchievementsService } from '../../services/achievements.service';
import { DatabaseService } from '../../services/database.service';
import { PlaybackService } from '../../services/playback.service';
import { BadgeProgress, BadgeCategory } from '../../models/achievement.model';
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
    const svg = BADGE_ICONS[badgeId as keyof typeof BADGE_ICONS] || BADGE_ICONS['starter'];
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

  getBadgesByCategory(category: BadgeCategory): BadgeProgress[] {
    return this.badges().filter((b) => b.badge.category === category);
  }

  getCategoryLabel(category: BadgeCategory): string {
    const labels: Record<BadgeCategory, string> = {
      collection: 'Collection',
      plays: 'Play Count',
      coverage: 'Coverage',
      discovery: 'Discovery',
      artist: 'Artist',
      album: 'Album',
    };
    return labels[category];
  }

  getProgressPercentage(badge: BadgeProgress): number {
    if (badge.isUnlocked) return 100;
    return Math.min(100, Math.round((badge.current / badge.required) * 100));
  }

  formatProgress(badge: BadgeProgress): string {
    if (badge.isUnlocked) return 'Unlocked';
    return `${badge.current}/${badge.required}`;
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
