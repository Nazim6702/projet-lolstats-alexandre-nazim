import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Champions } from './champions';

describe('Champions', () => {
  let component: Champions;
  let fixture: ComponentFixture<Champions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Champions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Champions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
