import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HowIWorkComponent } from './how-i-work.component';

describe('HowIWorkComponent', () => {
  let component: HowIWorkComponent;
  let fixture: ComponentFixture<HowIWorkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowIWorkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HowIWorkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
