import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GradesService } from '../../../service/grades.service';
import { CalendarResponseComponent } from '../../calendar/calendar-response/calendar-response.component';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-grades-create',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarResponseComponent],
  templateUrl: './grades-create.component.html',
  styleUrls: ['./grades-create.component.scss']
})
export class GradesCreateComponent {
  course_name = '';
  year: 'I year' | 'II year' | 'III year' | '' = '';
  cfu: number | null = null;
  grade: string = '';
  date: string = '';

  submitting = false;
  showResponse = false;
  responseTitle = 'Notice';
  responseMessage = '';
  responseVariant: Variant = 'info';

  constructor(private gradesService: GradesService, private router: Router) {}

  /** validazione dei campi */
  get isFormValid(): boolean {
    return (
      this.course_name.trim().length > 0 &&
      this.year !== '' &&
      this.cfu != null &&
      this.cfu > 0 &&
      this.grade.trim().length > 0 &&
      this.date.trim().length > 0
    );
  }

  onCancel(): void {
    this.router.navigate(['/grades']);
  }

  onSubmit(): void {
    if (!this.isFormValid) return;

    this.submitting = true;

    const payload = {
      course_name: this.course_name.trim(),
      year: this.year,
      cfu: Number(this.cfu),
      grade: this.grade.trim(),
      date: this.date
    } as any;

    this.gradesService.create(payload).subscribe({
      next: () => {
        this.responseTitle = 'Saved';
        this.responseMessage = 'The course has been created successfully.';
        this.responseVariant = 'success';
        this.showResponse = true;
        this.submitting = false;
      },
      error: (err) => {
        this.responseTitle = 'Creation failed';
        this.responseMessage = err?.error?.error || 'Unable to create the course. Please try again.';
        this.responseVariant = 'error';
        this.showResponse = true;
        this.submitting = false;
      }
    });
  }

  onResponseClose(): void {
    this.showResponse = false;
    this.router.navigate(['/grades']);
  }
}
