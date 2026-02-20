import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { DatabaseService } from './core/database.service';
import { CredentialsService } from './core/credentials.service';
import { MasterReleaseService } from './features/discogs/master-release.service';
import { PwaUpdateService } from './core/pwa-update.service';
import { AchievementsService } from './features/achievements/achievements.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  constructor(
    private db: DatabaseService,
    private credentialsService: CredentialsService,
    private masterReleaseService: MasterReleaseService,
    private pwaUpdateService: PwaUpdateService,
    private achievementsService: AchievementsService,
    private router: Router,
  ) {}

  async ngOnInit() {
    this.pwaUpdateService.initialize();
    await this.navigateBasedOnState();
  }

  private async navigateBasedOnState() {
    if (!this.credentialsService.hasCredentials()) {
      this.router.navigate(['/setup']);
      return;
    }

    const count = await this.db.getCollectionCount();
    if (count === 0) {
      this.router.navigate(['/sync']);
      return;
    }

    // Resume background services for returning users
    this.masterReleaseService.resumeIfNeeded();
    const releases = await this.db.getAllReleases();
    this.achievementsService.initialize(releases);
    this.router.navigate(['/']);
  }
}
