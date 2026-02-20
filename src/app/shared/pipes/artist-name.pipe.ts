import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to clean artist names by removing Discogs disambiguation numbers.
 * Discogs appends " (N)" to artist names when there are duplicates.
 *
 * Usage:
 *   {{ artists | artistName }}
 *   {{ artists | artistName:', ' }}
 *
 * Examples:
 *   ['Prince (2)', 'The Revolution'] | artistName -> 'Prince, The Revolution'
 *   'Prince (2)' | artistName -> 'Prince'
 */
@Pipe({
  name: 'artistName',
  standalone: true,
})
export class ArtistNamePipe implements PipeTransform {
  transform(value: string | string[] | null | undefined, separator: string = ', '): string {
    if (!value) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((name) => this.cleanArtistName(name)).join(separator);
    }

    return this.cleanArtistName(value);
  }

  private cleanArtistName(name: string): string {
    // Remove trailing " (N)" where N is one or more digits
    return name.replace(/\s+\(\d+\)$/, '');
  }
}
