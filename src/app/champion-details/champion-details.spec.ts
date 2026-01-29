import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChampionDetailsComponent } from './champion-details';

describe('ChampionDetailsComponent', () => {
  let component: ChampionDetailsComponent;
  let fixture: ComponentFixture<ChampionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChampionDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChampionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
