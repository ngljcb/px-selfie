import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatAiComponent } from './chat-ai.component';

describe('ChatAiComponent', () => {
  let component: ChatAiComponent;
  let fixture: ComponentFixture<ChatAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatAiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
