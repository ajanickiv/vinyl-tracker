import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecommendationService } from '../../services/recommendation.service';
import { PlaybackService } from '../../services/playback.service';
import { Release } from '../../models/release.model';
import { MenuDrawerComponent } from '../menu-drawer/menu-drawer.component';

@Component({
  selector: 'app-vinyl-player',
  standalone: true,
  imports: [CommonModule, MenuDrawerComponent],
  templateUrl: './vinyl-player.component.html',
  styleUrls: ['./vinyl-player.component.scss'],
})
export class VinylPlayerComponent implements OnInit {
  currentRelease = signal<Release | null>(null);
  isSpinning = signal(false);
  isLoading = signal(true);
  menuOpen = signal(false);

  constructor(
    private recommendationService: RecommendationService,
    private playbackService: PlaybackService,
  ) {}

  async ngOnInit() {
    await this.getNewRecommendation();
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  getFormatString(release: Release): string {
    return release.basicInfo.formats?.join(', ') || 'Unknown';
  }

  getFormattedDate(date?: Date): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }

  async getNewRecommendation() {
    this.isLoading.set(true);
    const recommendation = await this.recommendationService.getRecommendation();
    this.currentRelease.set(recommendation);
    this.isLoading.set(false);
  }

  async markAsPlayed() {
    const release = this.currentRelease();
    if (!release || this.isSpinning()) return;

    this.isSpinning.set(true);

    // Wait for spin animation to complete (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const updated = await this.playbackService.markAsPlayed(release.id);

    if (updated) {
      this.currentRelease.set(updated);
    }

    this.isSpinning.set(false);

    // auto-load next recommendation after marking as played
    await this.getNewRecommendation();
  }

  async skipToNext() {
    if (this.isSpinning()) return;
    await this.getNewRecommendation();
  }

  toggleMenu() {
    this.menuOpen.set(!this.menuOpen());
  }
}
