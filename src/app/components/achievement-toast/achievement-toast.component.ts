import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BadgeUnlockEvent } from '../../services/achievements.service';
import { TIER_COLORS, TierLevel, CoverageTierLevel } from '../../models/achievement.model';
import { BADGE_ICONS } from '../../constants/badge-icons.constants';

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

  getTierColor(): string {
    const tier = this.unlockEvent().tier;
    if (!tier) return '';
    return TIER_COLORS[tier.level as TierLevel | CoverageTierLevel] || '';
  }

  getDescription(): string {
    return this.unlockEvent().badge.description;
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
