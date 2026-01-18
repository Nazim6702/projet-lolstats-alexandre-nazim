import { TestBed } from '@angular/core/testing';

import { Champions } from './champions';

describe('Champions', () => {
  let service: Champions;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Champions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
