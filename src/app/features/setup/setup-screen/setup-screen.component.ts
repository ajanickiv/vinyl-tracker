import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CredentialsService } from '../../../core/credentials.service';
import { DatabaseService } from '../../../core/database.service';

@Component({
  selector: 'app-setup-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup-screen.component.html',
  styleUrls: ['./setup-screen.component.scss'],
})
export class SetupScreenComponent implements OnInit {
  username = signal('');
  token = signal('');
  showToken = signal(false);
  errorMessage = signal('');
  hasExistingData = signal(false);

  constructor(
    private credentialsService: CredentialsService,
    private db: DatabaseService,
    private router: Router,
  ) {}

  async ngOnInit() {
    const count = await this.db.getCollectionCount();
    this.hasExistingData.set(count > 0);
  }

  onUsernameChange(value: string) {
    this.username.set(value);
    this.errorMessage.set('');
  }

  onTokenChange(value: string) {
    this.token.set(value);
    this.errorMessage.set('');
  }

  toggleShowToken() {
    this.showToken.update((v) => !v);
  }

  submit() {
    const usernameValue = this.username().trim();
    const tokenValue = this.token().trim();

    if (!usernameValue) {
      this.errorMessage.set('Username is required');
      return;
    }

    if (!tokenValue) {
      this.errorMessage.set('Personal access token is required');
      return;
    }

    this.credentialsService.setCredentials({
      username: usernameValue,
      token: tokenValue,
    });

    if (this.hasExistingData()) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/sync']);
    }
  }
}
