import { TestBed } from '@angular/core/testing';

import { PrintServiceService } from './print-service.service';

describe('PrintServiceService', () => {
  let service: PrintServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrintServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
