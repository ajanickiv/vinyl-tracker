import { Component, OnInit, signal } from '@angular/core';
import { SyncScreenComponent } from './components/sync-screen/sync-screen.component';
import { VinylPlayerComponent } from './components/vinyl-player/vinyl-player.component';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SyncScreenComponent, VinylPlayerComponent],
  template: `
    @if (hasSyncedData()) {
      <app-vinyl-player></app-vinyl-player>
    } @else {
      <app-sync-screen (syncComplete)="onSyncComplete()"></app-sync-screen>
    }
  `
})
export class AppComponent implements OnInit {
  hasSyncedData = signal(false);

  constructor(private db: DatabaseService) { }

  async ngOnInit() {
    const count = await this.db.getCollectionCount();
    this.hasSyncedData.set(count > 0);
  }

  onSyncComplete() {
    this.hasSyncedData.set(true);
  }
}