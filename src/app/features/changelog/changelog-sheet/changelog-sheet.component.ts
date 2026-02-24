import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CHANGELOG, ChangelogEntry } from '../changelog.data';

@Component({
  selector: 'app-changelog-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './changelog-sheet.component.html',
  styleUrls: ['./changelog-sheet.component.scss'],
})
export class ChangelogSheetComponent {
  isOpen = input.required<boolean>();
  close = output<void>();

  readonly entries: ChangelogEntry[] = CHANGELOG;

  onBackdropClick(): void {
    this.close.emit();
  }

  closeSheet(): void {
    this.close.emit();
  }
}
