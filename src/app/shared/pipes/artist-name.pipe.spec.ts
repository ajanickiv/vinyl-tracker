import { ArtistNamePipe } from './artist-name.pipe';

describe('ArtistNamePipe', () => {
  let pipe: ArtistNamePipe;

  beforeEach(() => {
    pipe = new ArtistNamePipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('with string input', () => {
    it('should remove disambiguation number from artist name', () => {
      expect(pipe.transform('Prince (2)')).toBe('Prince');
    });

    it('should handle multi-digit disambiguation numbers', () => {
      expect(pipe.transform('John Smith (123)')).toBe('John Smith');
    });

    it('should not modify artist names without disambiguation', () => {
      expect(pipe.transform('The Beatles')).toBe('The Beatles');
    });

    it('should not remove parentheses that are part of the name', () => {
      expect(pipe.transform('Sunn O)))')).toBe('Sunn O)))');
    });

    it('should not remove non-numeric parentheses at the end', () => {
      expect(pipe.transform('Iron Maiden (UK)')).toBe('Iron Maiden (UK)');
    });

    it('should handle empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should handle null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });
  });

  describe('with array input', () => {
    it('should clean and join multiple artists', () => {
      expect(pipe.transform(['Prince (2)', 'The Revolution'])).toBe('Prince, The Revolution');
    });

    it('should clean all artists with disambiguation numbers', () => {
      expect(pipe.transform(['Prince (2)', 'Michael Jackson (3)'])).toBe('Prince, Michael Jackson');
    });

    it('should handle single artist array', () => {
      expect(pipe.transform(['Prince (2)'])).toBe('Prince');
    });

    it('should handle empty array', () => {
      expect(pipe.transform([])).toBe('');
    });

    it('should use custom separator', () => {
      expect(pipe.transform(['Prince (2)', 'The Revolution'], ' & ')).toBe(
        'Prince & The Revolution',
      );
    });

    it('should use custom separator with multiple artists', () => {
      expect(pipe.transform(['Artist 1', 'Artist 2', 'Artist 3'], ' / ')).toBe(
        'Artist 1 / Artist 2 / Artist 3',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle artist name that is just a number in parens', () => {
      expect(pipe.transform('(1)')).toBe('(1)');
    });

    it('should handle parentheses in middle of name', () => {
      expect(pipe.transform('Artist (feat. Someone) (2)')).toBe('Artist (feat. Someone)');
    });

    it('should handle multiple spaces before disambiguation', () => {
      expect(pipe.transform('Artist  (2)')).toBe('Artist');
    });
  });
});
