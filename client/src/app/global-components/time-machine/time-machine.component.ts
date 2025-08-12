import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeMachineService } from '../../service/time-machine.service';

@Component({
  selector: 'app-time-machine',
  imports: [FormsModule, CommonModule],
  standalone: true,
  templateUrl: './time-machine.component.html',
  styleUrls: ['./time-machine.component.scss']
})
export class TimeMachineComponent implements OnInit {
  showForm = false;
  selectedDateTime: string = '';

  constructor(private timeMachineService: TimeMachineService) { }
  
  ngOnInit(): void {
    const now = this.timeMachineService.getNow();
    this.selectedDateTime = this.toDatetimeLocalString(now);
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  setDate(): void {
    if (!this.selectedDateTime) return;

    const selected = new Date(this.selectedDateTime);
    if (isNaN(selected.getTime())) {
      alert('Data non valida');
      return;
    }

    this.timeMachineService.setVirtualNow(selected);
    this.setColor();
    this.showForm = true;
  }

  resetDate(): void {
    this.timeMachineService.reset();
    const now = this.timeMachineService.getNow();
    this.selectedDateTime = this.toDatetimeLocalString(now);
    this.resetColor();
    this.showForm = true;
  }

  private toDatetimeLocalString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private setColor(): void {
    document.documentElement.style.setProperty('--primary-bg', '#4badee');
    document.documentElement.style.setProperty('--primary-hover-bg', '#75c8ff');
  }

  private resetColor(): void {
    document.documentElement.style.setProperty('--primary-bg', '#fbd65a');
    document.documentElement.style.setProperty('--primary-hover-bg', '#fde289');
  }
}
