import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BadgeUnlockEvent } from '../achievements.service';
import { TIER_COLORS, TierLevel, CoverageTierLevel } from '../achievement.model';
import { BADGE_ICONS } from '../badge-icons.constants';

@Component({
  selector: 'app-achievement-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievement-toast.component.html',
  styleUrls: ['./achievement-toast.component.scss'],
})
export class AchievementToastComponent {
  unlockEvent = input.required<BadgeUnlockEvent>();
  dismiss = output<void>();

  tierColor = computed(() => {
    const tier = this.unlockEvent().tier;
    if (!tier) return '';
    return TIER_COLORS[tier.level as TierLevel | CoverageTierLevel] || '';
  });

  badgeIconBackground = computed(() => {
    const color = this.tierColor();
    if (!color) return null;
    return `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`;
  });

  constructor(private sanitizer: DomSanitizer) {}

  getBadgeIcon(): SafeHtml {
    const badgeId = this.unlockEvent().badge.id;
    const svg = BADGE_ICONS[badgeId as keyof typeof BADGE_ICONS] || BADGE_ICONS['collector'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getTitle(): string {
    const event = this.unlockEvent();
    if (event.isUpgrade) {
      return 'Tier Upgraded!';
    }
    return 'Achievement Unlocked!';
  }

  getBadgeName(): string {
    return this.unlockEvent().badge.name;
  }

  getTierName(): string | null {
    const tier = this.unlockEvent().tier;
    return tier ? tier.name : null;
  }

  getDescription(): string {
    return this.unlockEvent().badge.description;
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
