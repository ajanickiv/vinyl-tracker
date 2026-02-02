import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BadgeDefinition } from '../../models/achievement.model';
import { BADGE_ICONS } from '../../constants/badge-icons.constants';

@Component({
  selector: 'app-achievement-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievement-toast.component.html',
  styleUrls: ['./achievement-toast.component.scss'],
})
export class AchievementToastComponent {
  badge = input.required<BadgeDefinition>();
  dismiss = output<void>();

  constructor(private sanitizer: DomSanitizer) {}

  getBadgeIcon(badgeId: string): SafeHtml {
    const svg = BADGE_ICONS[badgeId as keyof typeof BADGE_ICONS] || BADGE_ICONS['starter'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
