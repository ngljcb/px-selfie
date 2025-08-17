import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteViewerComponent } from './note-viewer.component';

describe('NoteViewerComponent', () => {
  let component: NoteViewerComponent;
  let fixture: ComponentFixture<NoteViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
