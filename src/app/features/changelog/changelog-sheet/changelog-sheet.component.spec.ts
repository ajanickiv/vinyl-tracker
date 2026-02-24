import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ChangelogSheetComponent } from './changelog-sheet.component';
import { CHANGELOG } from '../changelog.data';

describe('ChangelogSheetComponent', () => {
  let spectator: Spectator<ChangelogSheetComponent>;

  const createComponent = createComponentFactory({
    component: ChangelogSheetComponent,
    detectChanges: false,
  });

  beforeEach(() => {
    spectator = createComponent({
      props: { isOpen: false },
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should expose all changelog entries', () => {
    expect(spectator.component.entries).toEqual(CHANGELOG);
    expect(spectator.component.entries.length).toBeGreaterThan(0);
  });

  it('should emit close when onBackdropClick is called', () => {
    const closeSpy = jest.fn();
    spectator.component.close.subscribe(closeSpy);

    spectator.component.onBackdropClick();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should emit close when closeSheet is called', () => {
    const closeSpy = jest.fn();
    spectator.component.close.subscribe(closeSpy);

    spectator.component.closeSheet();

    expect(closeSpy).toHaveBeenCalled();
  });

  describe('template', () => {
    beforeEach(() => {
      spectator = createComponent({ props: { isOpen: true } });
      spectator.detectChanges();
    });

    it('should render a version block for each changelog entry', () => {
      const blocks = spectator.queryAll('.version-block');
      expect(blocks.length).toBe(CHANGELOG.length);
    });

    it('should display the version number for each entry', () => {
      const versionNumbers = spectator.queryAll('.version-number');
      CHANGELOG.forEach((entry, i) => {
        expect(versionNumbers[i].textContent).toContain(entry.version);
      });
    });

    it('should display the date for each entry', () => {
      const dates = spectator.queryAll('.version-date');
      CHANGELOG.forEach((entry, i) => {
        expect(dates[i].textContent).toContain(entry.date);
      });
    });

    it('should render change items for the first entry', () => {
      const items = spectator.queryAll('.change-item');
      const totalChanges = CHANGELOG.reduce((sum, e) => sum + e.changes.length, 0);
      expect(items.length).toBe(totalChanges);
    });

    it('should add open class when isOpen is true', () => {
      expect(spectator.query('.sheet-container')).toHaveClass('open');
    });
  });
});
