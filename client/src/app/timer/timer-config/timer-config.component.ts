// src/app/features/timer/components/timer-config/timer-config.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TimerConfig } from '../../model/timer.interface';

interface ConfigProposal {
  id: number;
  name: string;
  description: string;
  studyMinutes: number;
  breakMinutes: number;
  totalCycles: number;
  totalTime: number; // in minutes
  studyTime: number; // total study time
  breakTime: number; // total break time
  details: string;
}

@Component({
  selector: 'app-timer-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './timer-config.component.html',
  styleUrls: ['./timer-config.component.scss']
})
export class TimerConfigComponent implements OnInit {
  @Input() currentConfig: TimerConfig | null = null;
  @Output() onConfigSave = new EventEmitter<TimerConfig>();
  @Output() onClose = new EventEmitter<void>();

  configForm: FormGroup;
  
  // Modalità form
  isManualMode = true;
  
  // Proposte generate
  proposals: ConfigProposal[] = [];
  selectedProposal: ConfigProposal | null = null;

  constructor(private fb: FormBuilder) {
    this.configForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.currentConfig) {
      this.configForm.patchValue({
        studyMinutes: this.currentConfig.studyMinutes,
        breakMinutes: this.currentConfig.breakMinutes,
        totalCycles: this.currentConfig.totalCycles,
        totalTime: this.calculateTotalTime(this.currentConfig)
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Modalità manuale
      studyMinutes: [30, [Validators.required, Validators.min(1), Validators.max(120)]],
      breakMinutes: [5, [Validators.required, Validators.min(1), Validators.max(30)]],
      totalCycles: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
      
      // Modalità automatica
      totalTime: [150, [Validators.required, Validators.min(10), Validators.max(480)]] // 8 ore max
    });
  }

  // ==================== MODALITÀ SWITCH ====================

  switchToManual(): void {
    this.isManualMode = true;
    this.selectedProposal = null;
    this.proposals = [];
  }

  switchToAutomatic(): void {
    this.isManualMode = false;
    this.generateProposals();
  }

  // ==================== GENERAZIONE PROPOSTE ====================

  generateProposals(): void {
    const totalTime = this.configForm.get('totalTime')?.value || 150;
    this.proposals = [];

    // Se tempo < 25 minuti: solo studio continuo
    if (totalTime < 25) {
      this.proposals.push({
        id: 1,
        name: 'Studio Continuo',
        description: 'Tempo insufficiente per pause, studio continuo',
        studyMinutes: totalTime,
        breakMinutes: 0,
        totalCycles: 1,
        totalTime: totalTime,
        studyTime: totalTime,
        breakTime: 0,
        details: `${totalTime} minuti di studio continuo`
      });
      return;
    }

    // Proposta 1: Pomodoro classico (25+5)
    this.generatePomodoroProposal(totalTime);

    // Proposta 2: Sessioni lunghe (50+10) - solo se >= 60 minuti
    if (totalTime >= 60) {
      this.generateLongSessionProposal(totalTime);
    }
  }

  private generatePomodoroProposal(totalTime: number): void {
    const studyBase = 25;
    const breakBase = 5;
    const cycleLength = studyBase + breakBase; // 30 minuti
    
    let cycles = Math.floor(totalTime / cycleLength);
    let remainingTime = totalTime % cycleLength;
    
    // Se rimane tempo, aggiungiamo studio extra nell'ultimo ciclo
    let finalStudyTime = studyBase;
    let finalBreakTime = breakBase;
    
    if (remainingTime > 0 && cycles > 0) {
      finalStudyTime = studyBase + remainingTime;
    } else if (cycles === 0) {
      // Caso edge: meno di 30 minuti totali
      cycles = 1;
      finalStudyTime = totalTime - breakBase;
      if (finalStudyTime < 1) {
        finalStudyTime = totalTime;
        finalBreakTime = 0;
      }
    }

    const totalStudyTime = (cycles - 1) * studyBase + finalStudyTime;
    const totalBreakTime = (cycles - 1) * breakBase + finalBreakTime;

    this.proposals.push({
      id: 1,
      name: 'Pomodoro Classico',
      description: 'Cicli da 25 min studio + 5 min pausa',
      studyMinutes: studyBase,
      breakMinutes: breakBase,
      totalCycles: cycles,
      totalTime: totalTime,
      studyTime: totalStudyTime,
      breakTime: totalBreakTime,
      details: this.buildPomodoroDetails(cycles, studyBase, breakBase, finalStudyTime, finalBreakTime)
    });
  }

  private generateLongSessionProposal(totalTime: number): void {
    const studyBase = 50;
    const breakBase = 10;
    const cycleLength = studyBase + breakBase; // 60 minuti
    
    let cycles = Math.floor(totalTime / cycleLength);
    let remainingTime = totalTime % cycleLength;
    
    // Se rimane tempo, aggiungiamo studio extra nell'ultimo ciclo
    let finalStudyTime = studyBase;
    let finalBreakTime = breakBase;
    
    if (remainingTime > 0 && cycles > 0) {
      finalStudyTime = studyBase + remainingTime;
    } else if (cycles === 0) {
      // Caso edge: meno di 60 minuti ma >= 60 (giusto al limite)
      cycles = 1;
      finalStudyTime = totalTime - breakBase;
      if (finalStudyTime < 1) {
        finalStudyTime = totalTime;
        finalBreakTime = 0;
      }
    }

    const totalStudyTime = (cycles - 1) * studyBase + finalStudyTime;
    const totalBreakTime = (cycles - 1) * breakBase + finalBreakTime;

    this.proposals.push({
      id: 2,
      name: 'Sessioni Lunghe',
      description: 'Cicli da 50 min studio + 10 min pausa',
      studyMinutes: studyBase,
      breakMinutes: breakBase,
      totalCycles: cycles,
      totalTime: totalTime,
      studyTime: totalStudyTime,
      breakTime: totalBreakTime,
      details: this.buildLongSessionDetails(cycles, studyBase, breakBase, finalStudyTime, finalBreakTime)
    });
  }

  private buildPomodoroDetails(cycles: number, studyBase: number, breakBase: number, finalStudyTime: number, finalBreakTime: number): string {
    if (cycles === 1) {
      return `${finalStudyTime} min studio${finalBreakTime > 0 ? ` + ${finalBreakTime} min pausa` : ''}`;
    }
    
    const details = [];
    
    // Cicli standard
    if (cycles > 1) {
      details.push(`${cycles - 1} cicli da ${studyBase}+${breakBase} min`);
    }
    
    // Ultimo ciclo (potrebbe essere diverso)
    if (finalStudyTime !== studyBase || finalBreakTime !== breakBase) {
      details.push(`ultimo ciclo: ${finalStudyTime}+${finalBreakTime} min`);
    } else {
      details.push(`ultimo ciclo: ${studyBase}+${breakBase} min`);
    }
    
    return details.join(', ');
  }

  private buildLongSessionDetails(cycles: number, studyBase: number, breakBase: number, finalStudyTime: number, finalBreakTime: number): string {
    if (cycles === 1) {
      return `${finalStudyTime} min studio${finalBreakTime > 0 ? ` + ${finalBreakTime} min pausa` : ''}`;
    }
    
    const details = [];
    
    // Cicli standard
    if (cycles > 1) {
      details.push(`${cycles - 1} cicli da ${studyBase}+${breakBase} min`);
    }
    
    // Ultimo ciclo (potrebbe essere diverso)
    if (finalStudyTime !== studyBase || finalBreakTime !== breakBase) {
      details.push(`ultimo ciclo: ${finalStudyTime}+${finalBreakTime} min`);
    } else {
      details.push(`ultimo ciclo: ${studyBase}+${breakBase} min`);
    }
    
    return details.join(', ');
  }

  // ==================== SELEZIONE PROPOSTA ====================

  selectProposal(proposal: ConfigProposal): void {
    this.selectedProposal = proposal;
    
    // Aggiorna i valori del form per preview
    this.configForm.patchValue({
      studyMinutes: proposal.studyMinutes,
      breakMinutes: proposal.breakMinutes,
      totalCycles: proposal.totalCycles
    });
  }

  // ==================== VALIDAZIONE E SALVATAGGIO ====================

  onTotalTimeChange(): void {
    if (!this.isManualMode) {
      this.generateProposals();
      this.selectedProposal = null;
    }
  }

 isFormValid(): boolean {
  if (this.isManualMode) {
    return !!(this.configForm.get('studyMinutes')?.valid && 
             this.configForm.get('breakMinutes')?.valid && 
             this.configForm.get('totalCycles')?.valid);
  } else {
    return this.selectedProposal !== null;
  }
}

  saveConfig(): void {
    if (!this.isFormValid()) return;

    let config: TimerConfig;

    if (this.isManualMode) {
      config = {
        studyMinutes: this.configForm.get('studyMinutes')?.value,
        breakMinutes: this.configForm.get('breakMinutes')?.value,
        totalCycles: this.configForm.get('totalCycles')?.value
      };
    } else {
      config = {
        studyMinutes: this.selectedProposal!.studyMinutes,
        breakMinutes: this.selectedProposal!.breakMinutes,
        totalCycles: this.selectedProposal!.totalCycles
      };
    }

    this.onConfigSave.emit(config);
  }

  cancel(): void {
    this.onClose.emit();
  }

  // ==================== UTILITY ====================

  private calculateTotalTime(config: TimerConfig): number {
    return (config.studyMinutes + config.breakMinutes) * config.totalCycles;
  }

  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  getPreviewText(): string {
    if (this.isManualMode) {
      const study = this.configForm.get('studyMinutes')?.value || 0;
      const breakTime = this.configForm.get('breakMinutes')?.value || 0;
      const cycles = this.configForm.get('totalCycles')?.value || 0;
      const totalTime = (study + breakTime) * cycles;
      const totalStudy = study * cycles;
      const totalBreak = breakTime * cycles;
      
      return `Totale: ${this.formatTime(totalTime)} (${this.formatTime(totalStudy)} studio + ${this.formatTime(totalBreak)} pausa)`;
    } else {
      return this.selectedProposal ? 
        `Totale: ${this.formatTime(this.selectedProposal.totalTime)} (${this.formatTime(this.selectedProposal.studyTime)} studio + ${this.formatTime(this.selectedProposal.breakTime)} pausa)` : 
        'Seleziona una proposta';
    }
  }
}