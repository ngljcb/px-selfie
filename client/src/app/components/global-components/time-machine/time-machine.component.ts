import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeMachineService } from '../../../service/time-machine.service';

@Component({
  selector: 'app-time-machine',
  imports: [FormsModule, CommonModule],
  standalone: true,
  templateUrl: './time-machine.component.html',
  styleUrls: ['./time-machine.component.scss']
})
export class TimeMachineComponent implements OnInit, OnDestroy {
  showForm = false;
  selectedDateTime: string = '';
  imgSrc = 'assets/hourglass.svg';
  alertMessage: string | null = null;
  dateError = false;
  isVirtualActive = false;

  private tickTimer: any = null;
  private realAnchorMs = 0;
  private virtualAnchorMs = 0;

  constructor(private timeMachineService: TimeMachineService) { }

  ngOnInit(): void {
    const now = this.timeMachineService.getNow();
    this.selectedDateTime = this.toDatetimeLocalString(now);
    this.startTick();
  }

  ngOnDestroy(): void {
    this.clearTick();
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  setDate(): void {
    if (!this.selectedDateTime) return;

    this.dateError = false;
    this.alertMessage = null;

    const selected = new Date(this.selectedDateTime);
    if (isNaN(selected.getTime())) {
      this.showAlert('Data non valida');
      this.dateError = true;
      return;
    }

    const nowStr = this.toDatetimeLocalString(this.timeMachineService.getNow());

    if (this.selectedDateTime === nowStr) {
      this.showAlert('Date/time matches current. Choose another.');
      this.dateError = true;
      return;
    }

    this.timeMachineService.setVirtualNow(selected);
    this.setColor();
    this.showForm = true;
    this.isVirtualActive = true;
    this.realAnchorMs = Date.now();
    this.virtualAnchorMs = selected.getTime();
  }

  resetDate(): void {
    if (!this.isVirtualActive) return;

    this.dateError = false;

    this.timeMachineService.reset();
    const now = new Date();
    this.selectedDateTime = this.toDatetimeLocalString(now);
    this.resetColor();
    this.showForm = true;
    this.isVirtualActive = false;
    this.realAnchorMs = 0;
    this.virtualAnchorMs = 0;
  }

  showAlert(message: string) {
    this.alertMessage = message;
    setTimeout(() => this.alertMessage = null, 3000);
  }

  private toDatetimeLocalString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  private setColor(): void {
    this.imgSrc = 'assets/hourglass_tm.svg';
    document.documentElement.style.setProperty('--primary-bg', '#75c8ff');
    document.documentElement.style.setProperty('--primary-hover-bg', '#4badee');
    document.documentElement.style.setProperty('--secondary-bg', '#e6f7ff');
    document.documentElement.style.setProperty('--time-machine-bg', '#fde289');
    document.documentElement.style.setProperty('--today-bg', '#e6f7ff');
    document.documentElement.style.setProperty('--select-bg', '#fff6cc');
  }

  private resetColor(): void {
    this.imgSrc = 'assets/hourglass.svg';
    document.documentElement.style.setProperty('--primary-bg', '#fbd65a');
    document.documentElement.style.setProperty('--primary-hover-bg', '#fde289');
    document.documentElement.style.setProperty('--secondary-bg', '#fff6cc');
    document.documentElement.style.setProperty('--time-machine-bg', '#83CBEB');
    document.documentElement.style.setProperty('--today-bg', '#fff6cc');
    document.documentElement.style.setProperty('--select-bg', '#e6f7ff');
  }

  private startTick(): void {
    this.clearTick();
    this.tickTimer = setInterval(() => {
      if (this.isVirtualActive) {
        const elapsed = Date.now() - this.realAnchorMs;
        const virtualNow = new Date(this.virtualAnchorMs + elapsed);
        this.selectedDateTime = this.toDatetimeLocalString(virtualNow);
        this.timeMachineService.setVirtualNow(virtualNow);
      } else {
        const realNow = new Date();
        this.selectedDateTime = this.toDatetimeLocalString(realNow);
      }
    }, 1000);
  }

  private clearTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}
