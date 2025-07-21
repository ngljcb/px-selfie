import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeBoxComponent } from './home-box.component';

describe('HomeBoxComponent', () => {
  let component: HomeBoxComponent;
  let fixture: ComponentFixture<HomeBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeBoxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
