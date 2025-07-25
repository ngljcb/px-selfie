import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteBoxComponent } from './note-box.component';

describe('NoteBoxComponent', () => {
  let component: NoteBoxComponent;
  let fixture: ComponentFixture<NoteBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteBoxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
