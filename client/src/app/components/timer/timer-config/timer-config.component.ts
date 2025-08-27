import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TimerConfig, ConfigProposal } from '../../../model/timer.interface';

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
        totalTimeHours: Math.floor(this.calculateTotalTime(this.currentConfig) / 60),
        totalTimeMinutes: this.calculateTotalTime(this.currentConfig) % 60
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Modalità manuale
      studyMinutes: [30, [Validators.required, Validators.min(1), Validators.max(120)]],
      breakMinutes: [5, [Validators.required, Validators.min(1), Validators.max(30)]],
      totalCycles: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
      
      // Modalità automatica - separati in ore e minuti
      totalTimeHours: [2, [Validators.required, Validators.min(0), Validators.max(8)]],
      totalTimeMinutes: [30, [Validators.required, Validators.min(0), Validators.max(59)]]
    });
  }

  switchToManual(): void {
    this.isManualMode = true;
    this.selectedProposal = null;
    this.proposals = [];
  }

  switchToAutomatic(): void {
    this.isManualMode = false;
    this.generateProposals();
  }

  getTotalTimeInMinutes(): number {
    const hours = this.configForm.get('totalTimeHours')?.value || 0;
    const minutes = this.configForm.get('totalTimeMinutes')?.value || 0;
    return hours * 60 + minutes;
  }

  setTotalTimeFromMinutes(totalMinutes: number): void {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    this.configForm.patchValue({
      totalTimeHours: hours,
      totalTimeMinutes: minutes
    });
  }

  formatTimeDisplay(): string {
    const hours = this.configForm.get('totalTimeHours')?.value || 0;
    const minutes = this.configForm.get('totalTimeMinutes')?.value || 0;
    const totalMinutes = this.getTotalTimeInMinutes();
    
    if (hours === 0 && minutes === 0) {
      return 'Inserisci tempo valido';
    }
    
    let display = '';
    if (hours > 0) {
      display += `${hours}h`;
    }
    if (minutes > 0) {
      if (display) display += ' ';
      display += `${minutes}min`;
    }
    
    return `${totalMinutes} minuti`;
  }

  generateProposals(): void {
    const TT = this.getTotalTimeInMinutes(); // Tempo Totale
    this.proposals = [];

    // Validazione minima
    if (TT < 10) {
      return;
    }

    // Caso 1: TT < 25 minuti -> Solo studio continuo
    if (TT < 25) {
      this.proposals.push({
        id: 1,
        name: 'Studio Continuo',
        studyMinutes: TT,
        breakMinutes: 0,
        totalCycles: 1,
        totalTime: TT,
        studyTime: TT,
        breakTime: 0,
        details: `${TT} minuti di studio continuo`
      });
      return;
    }

    // Caso 2: TT >= 25 minuti -> Genera proposte con cicli
    this.generateCycleProposals(TT);
  }

  private generateCycleProposals(TT: number): void {

    const baseConfigs = [
      { study: 25, break: 5, name: 'Pomodoro Classico(25+5)'},
      { study: 30, break: 5, name: 'Pomodoro Medio(30+5)'},
      { study: 50, break: 10, name: 'Pomodoro Grande(50+10)'}
    ];

    let proposalId = 1;

    baseConfigs.forEach(config => {
      const proposal = this.calculateOptimalCycles(TT, config.study, config.break, proposalId, config.name);
      if (proposal) {
        this.proposals.push(proposal);
        proposalId++;
      }
    });
  }

  private calculateOptimalCycles(TT: number, TS: number, TP: number, id: number, name: string): ConfigProposal | null {
    const CC = TS + TP; // Ciclo Completo
    
    // Se non possiamo fare nemmeno un periodo di studio, non possiamo fare questa configurazione
    if (TS > TT) {
      return null;
    }

    // Calcola quanti cicli completi possiamo fare
    const completeCycles = Math.floor(TT / CC);
    const TR = TT - (completeCycles * CC); // Tempo Rimanente

    let finalStudyTime = TS;
    let finalBreakTime = TP;
    let totalCycles = completeCycles;
    let actualTotalStudyTime = completeCycles * TS;
    let actualTotalBreakTime = completeCycles * TP;

    // Gestione del tempo rimanente
    if (TR > 0) {
      totalCycles++; // Aggiungiamo un ciclo finale

      if (TS < TR && TR < CC) {
        // Caso: TS < TR < CC
        // Facciamo studio completo + pausa ridotta
        finalStudyTime = TS;
        finalBreakTime = TR - TS;
        actualTotalStudyTime += TS;
        actualTotalBreakTime += (TR - TS);
      } else if (TR === TS) {
        // Caso: TR = TS
        // Solo studio, nessuna pausa
        finalStudyTime = TS;
        finalBreakTime = 0;
        actualTotalStudyTime += TS;
      } else if (TR < TS) {
        // Caso: TR < TS
        // Studio ridotto
        finalStudyTime = TR;
        finalBreakTime = 0;
        actualTotalStudyTime += TR;
      }
    }

    return {
      id: id,
      name: name,
      studyMinutes: TS, // Tempo studio
      breakMinutes: TP, // Tempo pausa
      totalCycles: totalCycles,
      totalTime: TT,
      studyTime: actualTotalStudyTime,
      breakTime: actualTotalBreakTime,
      details: this.buildCycleDetails(completeCycles, TS, TP, finalStudyTime, finalBreakTime, TR > 0)
    };
  }

  private buildCycleDetails(completeCycles: number, baseStudy: number, baseBreak: number, finalStudy: number, finalBreak: number, hasRemainder: boolean): string {
    const details = [];
    
    if (completeCycles > 0) {
      details.push(`${completeCycles} cicli da ${baseStudy}+${baseBreak} min`);
    }
    
    if (hasRemainder) {
      if (finalBreak > 0) {
        details.push(`ultimo: ${finalStudy}+${finalBreak} min`);
      } else {
        details.push(`ultimo: ${finalStudy} min studio`);
      }
    }
    
    return details.length > 0 ? details.join(', ') : `${finalStudy} min studio`;
  }

  selectProposal(proposal: ConfigProposal): void {
    this.selectedProposal = proposal;
    
    this.configForm.patchValue({
      studyMinutes: proposal.studyMinutes,
      breakMinutes: proposal.breakMinutes,
      totalCycles: proposal.totalCycles
    });
  }

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
      return this.selectedProposal !== null && this.getTotalTimeInMinutes() >= 10;
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
      // Per la modalità automatica, usiamo la configurazione della proposta selezionata
      // Ma dobbiamo gestire i cicli variabili, quindi usiamo i valori base
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