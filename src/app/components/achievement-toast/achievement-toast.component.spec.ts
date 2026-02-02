import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AchievementToastComponent } from './achievement-toast.component';
import { BadgeDefinition } from '../../models/achievement.model';
import { BADGE_ICONS } from '../../constants/badge-icons.constants';

describe('AchievementToastComponent', () => {
  let component: AchievementToastComponent;
  let fixture: ComponentFixture<AchievementToastComponent>;

  const mockBadge: BadgeDefinition = {
    id: 'starter',
    name: 'Starter',
    description: 'Add 10 albums to your collection',
    category: 'collection',
    requirement: 10,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AchievementToastComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AchievementToastComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('badge', mockBadge);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display badge name', () => {
    const badgeName = fixture.nativeElement.querySelector('.badge-name');
    expect(badgeName).toBeTruthy();
    expect(badgeName.textContent.trim()).toBe('Starter');
  });

  it('should display badge description', () => {
    const description = fixture.nativeElement.querySelector('.badge-description');
    expect(description).toBeTruthy();
    expect(description.textContent.trim()).toBe('Add 10 albums to your collection');
  });

  it('should display "Achievement Unlocked!" title', () => {
    const title = fixture.nativeElement.querySelector('.toast-title');
    expect(title.textContent).toContain('Achievement Unlocked!');
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
    const icon = component.getBadgeIcon('starter');
    expect((icon as any).changingThisBreaksApplicationSecurity).toContain('svg');
  });

  it('should return default icon SafeHtml for unknown badge id', () => {
    const icon = component.getBadgeIcon('unknown-badge');
    expect((icon as any).changingThisBreaksApplicationSecurity).toBe(BADGE_ICONS['starter']);
  });
});
