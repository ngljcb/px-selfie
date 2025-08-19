// src/app/components/time-machine/time-machine.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeMachineService } from '../../../service/time-machine.service';

@Component({
  selector: 'app-time-machine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-machine.component.html',
  styleUrls: ['./time-machine.component.scss']
})
export class TimeMachineComponent implements OnInit, OnDestroy {
  showForm = false;
  selectedDateTime = '';          // bound to <input type="datetime-local">
  imgSrc = 'assets/hourglass.svg';
  alertMessage: string | null = null;
  dateError = false;
  isVirtualActive = false;

  displayNowText = '';            // pretty clock text dd-MM-yyyy HH:mm:ss
  private tickTimer: any = null;

  constructor(private timeMachineService: TimeMachineService) {}

  ngOnInit(): void {
    const now = this.timeMachineService.getNow();
    this.isVirtualActive = !!this.timeMachineService.getVirtualNow();

    this.selectedDateTime = this.toInputString(now); // YYYY-MM-DDTHH:mm
    this.displayNowText = this.toTickString(now);    // dd-MM-yyyy HH:mm:ss

    this.startTick();

    if (this.isVirtualActive) this.setColor();
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

    const picked = this.parseInputString(this.selectedDateTime);
    if (!picked) {
      this.showAlert('Formato non valido.');
      this.dateError = true;
      return;
    }

    // Se coincide con l’orario corrente simulato/reale, avvisa
    const nowStr = this.toInputString(this.timeMachineService.getNow());
    if (this.selectedDateTime === nowStr) {
      this.showAlert('La data/ora coincide con l’attuale. Scegline un’altra.');
      this.dateError = true;
      return;
    }

    this.timeMachineService.setVirtualNow(picked);
    this.isVirtualActive = true;
    this.setColor();
    this.showForm = true;
  }

  resetDate(): void {
    if (!this.isVirtualActive) return;

    this.dateError = false;

    this.timeMachineService.reset();
    const now = new Date();
    this.selectedDateTime = this.toInputString(now);
    this.displayNowText = this.toTickString(now);

    this.isVirtualActive = false;
    this.resetColor();
    this.showForm = true;
  }

  // ---------- Tick / formatting ----------
  private startTick(): void {
    this.clearTick();
    this.tickTimer = setInterval(() => {
      const now = this.timeMachineService.getNow(); // segue virtuale se attivo
      this.displayNowText = this.toTickString(now);
      // NON tocchiamo selectedDateTime per non interferire con l’input
    }, 1000);
  }

  private clearTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  // Per l’orologio (con secondi) -> dd-MM-yyyy HH:mm:ss
  private toTickString(d: Date): string {
    const dd = this.pad(d.getDate());
    const MM = this.pad(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const hh = this.pad(d.getHours());
    const mm = this.pad(d.getMinutes());
    const ss = this.pad(d.getSeconds());
    return `${dd}-${MM}-${yyyy} ${hh}:${mm}:${ss}`;
  }

  // Per l’input datetime-local (senza secondi) -> YYYY-MM-DDTHH:mm
  private toInputString(d: Date): string {
    const yyyy = d.getFullYear();
    const MM = this.pad(d.getMonth() + 1);
    const dd = this.pad(d.getDate());
    const hh = this.pad(d.getHours());
    const mm = this.pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  }

  // Parse da input "YYYY-MM-DDTHH:mm" -> Date | null
  private parseInputString(s: string): Date | null {
    // Affidiamoci al costruttore nativo che interpreta come ora locale
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // ---------- UI helpers ----------
  private showAlert(message: string) {
    this.alertMessage = message;
    setTimeout(() => (this.alertMessage = null), 3000);
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
}
