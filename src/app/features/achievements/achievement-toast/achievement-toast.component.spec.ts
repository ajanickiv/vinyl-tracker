import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AchievementToastComponent } from './achievement-toast.component';
import { BadgeUnlockEvent } from '../achievements.service';
import { BADGE_DEFINITIONS } from '../achievement.model';

describe('AchievementToastComponent', () => {
  let component: AchievementToastComponent;
  let fixture: ComponentFixture<AchievementToastComponent>;

  const mockUnlockEvent: BadgeUnlockEvent = {
    badge: BADGE_DEFINITIONS[0], // collector
    tier: { level: 'bronze', threshold: 10, name: 'Bronze' },
    isUpgrade: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AchievementToastComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementToastComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('unlockEvent', mockUnlockEvent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display badge name', () => {
    const badgeName = fixture.nativeElement.querySelector('.badge-name');
    expect(badgeName).toBeTruthy();
    expect(badgeName.textContent).toContain('Collector');
  });

  it('should display badge description', () => {
    const description = fixture.nativeElement.querySelector('.badge-description');
    expect(description).toBeTruthy();
    expect(description.textContent).toContain('Build your vinyl collection');
  });

  it('should display "Achievement Unlocked!" title for new unlock', () => {
    const title = fixture.nativeElement.querySelector('.toast-title');
    expect(title.textContent).toContain('Achievement Unlocked!');
  });

  it('should display "Tier Upgraded!" title for tier upgrade', () => {
    const upgradeEvent: BadgeUnlockEvent = {
      badge: BADGE_DEFINITIONS[0],
      tier: { level: 'silver', threshold: 50, name: 'Silver' },
      isUpgrade: true,
    };
    fixture.componentRef.setInput('unlockEvent', upgradeEvent);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.toast-title');
    expect(title.textContent).toContain('Tier Upgraded!');
  });

  it('should display tier name when present', () => {
    const tierName = fixture.nativeElement.querySelector('.tier-name');
    expect(tierName).toBeTruthy();
    expect(tierName.textContent).toContain('Bronze');
  });

  it('should display badge icon', () => {
    const icon = fixture.nativeElement.querySelector('.badge-icon');
    expect(icon).toBeTruthy();
    expect(icon.innerHTML).toContain('svg');
  });

  it('should emit dismiss when OK button clicked', () => {
    const dismissSpy = jest.spyOn(component.dismiss, 'emit');
    const button = fixture.nativeElement.querySelector('.dismiss-btn');
    button.click();
    expect(dismissSpy).toHaveBeenCalled();
  });

  it('should display dismiss button with OK text', () => {
    const button = fixture.nativeElement.querySelector('.dismiss-btn');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('OK');
  });

  it('should return SafeHtml for valid badge id', () => {
    const icon = component.getBadgeIcon();
    expect((icon as any).changingThisBreaksApplicationSecurity).toContain('svg');
  });

  it('should return tier color for tiered unlock', () => {
    expect(component.tierColor()).toBe('#cd7f32'); // Bronze color
  });

  it('should return empty string for non-tiered unlock', () => {
    const noTierEvent: BadgeUnlockEvent = {
      badge: BADGE_DEFINITIONS.find((b) => b.id === 'genre-explorer')!,
      isUpgrade: false,
    };
    fixture.componentRef.setInput('unlockEvent', noTierEvent);
    fixture.detectChanges();

    expect(component.tierColor()).toBe('');
  });

  it('should get correct title based on isUpgrade', () => {
    expect(component.getTitle()).toBe('Achievement Unlocked!');

    const upgradeEvent: BadgeUnlockEvent = {
      badge: BADGE_DEFINITIONS[0],
      tier: { level: 'gold', threshold: 100, name: 'Gold' },
      isUpgrade: true,
    };
    fixture.componentRef.setInput('unlockEvent', upgradeEvent);
    fixture.detectChanges();

    expect(component.getTitle()).toBe('Tier Upgraded!');
  });

  it('should return tier name or null', () => {
    expect(component.getTierName()).toBe('Bronze');

    const noTierEvent: BadgeUnlockEvent = {
      badge: BADGE_DEFINITIONS.find((b) => b.id === 'genre-explorer')!,
      isUpgrade: false,
    };
    fixture.componentRef.setInput('unlockEvent', noTierEvent);
    fixture.detectChanges();

    expect(component.getTierName()).toBeNull();
  });
});
