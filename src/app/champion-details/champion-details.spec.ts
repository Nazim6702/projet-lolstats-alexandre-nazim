import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChampionDetails } from './champion-details';

describe('ChampionDetails', () => {
  let component: ChampionDetails;
  let fixture: ComponentFixture<ChampionDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChampionDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChampionDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
