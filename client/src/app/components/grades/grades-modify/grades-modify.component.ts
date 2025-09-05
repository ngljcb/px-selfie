// src/app/components/grades/grades-modify/grades-modify.component.ts 
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GradesService } from '../../../service/grades.service';
import { Grade } from '../../../model/entity/grade.model';

@Component({
  selector: 'app-grades-modify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grades-modify.component.html',
  styleUrl: './grades-modify.component.scss'
})
export class GradesModifyComponent implements OnInit {
  grade: Grade | null = null;

  courseName = '';
  year = '';
  cfu: number | null = null;
  gradeValue: number | null = null; 
  date: string = '';

  saving = false;
  gradeOptions: number[] = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gradesService: GradesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.router.navigate(['/grades']);
      return;
    }
    this.gradesService.get(id).subscribe({
      next: (g) => {
        this.grade = g;
        this.courseName = g.course_name ?? '';
        this.year = g.year ?? '';
        this.cfu = g.cfu ?? null;
        this.gradeValue = g.grade ?? null;
        this.date = g.date ? g.date.split('T')[0] : '';
      },
      error: () => {
        this.router.navigate(['/grades']);
      }
    });
  }

  isValid(): boolean {
    const cfuOk = this.cfu != null && Number.isFinite(this.cfu) && this.cfu > 0;
    const gradeOk = this.gradeValue != null;
    return !!(this.courseName.trim() && this.year && cfuOk && gradeOk && this.date);
  }

  onCancel(): void {
    this.router.navigate(['/grades']);
  }

  onSave(): void {
    if (!this.isValid() || !this.grade) return;
    this.saving = true;

    const patch: Partial<Grade> = {
      course_name: this.courseName.trim(),
      year: this.year,
      cfu: Number(this.cfu),
      grade: this.gradeValue!,
      date: this.date
    };

    this.gradesService.update(this.grade.id, patch).subscribe({
      next: () => {
        this.saving = false;

        // Best-effort: invalida eventuale cache del service se presente (non cambia la logica esistente)
        (this.gradesService as any)?.resetState?.();
        (this.gradesService as any)?.refreshGrades?.();

        // Naviga a /grades con un query param “buster” per forzare il refresh della lista/medie
        this.router.navigate(['/grades'], { queryParams: { r: Date.now() } });
      },
      error: () => {
        this.saving = false;
        alert('Failed to update course');
      }
    });
  }
}
