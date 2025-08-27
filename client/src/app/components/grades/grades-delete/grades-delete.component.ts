import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GradesService } from '../../../service/grades.service';
import { Grade } from '../../../model/entity/grade.model';
import { CalendarResponseComponent } from '../../calendar/calendar-response/calendar-response.component';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-grades-delete',
  standalone: true,
  imports: [CommonModule, CalendarResponseComponent],
  templateUrl: './grades-delete.component.html'
})
export class GradesDeleteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gradesService = inject(GradesService);

  grade: Grade | null = null;

  // response modal
  showResponse = false;
  responseTitle = 'Notice';
  responseMessage = '';
  responseVariant: Variant = 'info';
  private deletedOk = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam != null ? Number(idParam) : NaN;

    if (!Number.isFinite(id)) {
      this.responseTitle = 'Invalid URL';
      this.responseMessage = 'Missing or invalid grade id.';
      this.responseVariant = 'error';
      this.showResponse = true;
      return;
    }

    this.gradesService.get(id).subscribe({
      next: (g) => (this.grade = g),
      error: () => {
        this.responseTitle = 'Load failed';
        this.responseMessage = 'Unable to load the selected course.';
        this.responseVariant = 'error';
        this.showResponse = true;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/grades']);
  }

  onConfirm(): void {
    const id = this.grade?.id;
    if (id == null) {
      this.responseTitle = 'Deletion failed';
      this.responseMessage = 'Missing grade id.';
      this.responseVariant = 'error';
      this.showResponse = true;
      return;
    }

    this.gradesService.delete(id).subscribe({
      next: () => {
        this.deletedOk = true;
        this.responseTitle = 'Deleted';
        this.responseMessage = 'The course has been deleted successfully.';
        this.responseVariant = 'success';
        this.showResponse = true;
      },
      error: () => {
        this.deletedOk = false;
        this.responseTitle = 'Deletion failed';
        this.responseMessage = 'Unable to delete the course. Please try again.';
        this.responseVariant = 'error';
        this.showResponse = true;
      }
    });
  }

  onResponseClose(): void {
    this.showResponse = false;
    // After closing the response, always return to the list
    this.router.navigate(['/grades']);
  }
}