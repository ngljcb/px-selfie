import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext?: AudioContext;
  private isEnabled = true;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext non supportato:', error);
      this.isEnabled = false;
    }
  }

  playStudyCompleteSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      this.playToneSequence([
        { frequency: 523.25, duration: 0.3, delay: 0 },   
        { frequency: 659.25, duration: 0.3, delay: 0.1 },   
        { frequency: 783.99, duration: 0.5, delay: 0.2 }  
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono studio:', error);
    }
  }

  playBreakCompleteSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      this.playToneSequence([
        { frequency: 440, duration: 0.15, delay: 0 },    
        { frequency: 554.37, duration: 0.15, delay: 0.1 }, 
        { frequency: 659.25, duration: 0.15, delay: 0.2 }, 
        { frequency: 880, duration: 0.4, delay: 0.3 }   
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono pausa:', error);
    }
  }

  playSessionCompleteSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      this.playToneSequence([
        { frequency: 523.25, duration: 0.2, delay: 0 },    
        { frequency: 659.25, duration: 0.2, delay: 0.15 }, 
        { frequency: 783.99, duration: 0.2, delay: 0.3 },  
        { frequency: 1046.5, duration: 0.6, delay: 0.45 }  
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono completamento:', error);
    }
  }

  playPhaseSkippedSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      this.playToneSequence([
        { frequency: 800, duration: 0.1, delay: 0 },
        { frequency: 600, duration: 0.1, delay: 0.12 }
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono skip:', error);
    }
  }

  private playToneSequence(tones: Array<{frequency: number, duration: number, delay: number}>): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    tones.forEach(tone => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'sine'; 
      oscillator.frequency.setValueAtTime(tone.frequency, now + tone.delay);

      gainNode.gain.setValueAtTime(0, now + tone.delay);
      gainNode.gain.linearRampToValueAtTime(0.1, now + tone.delay + 0.01); 
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + tone.delay + tone.duration);

      oscillator.start(now + tone.delay);
      oscillator.stop(now + tone.delay + tone.duration);
    });
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled && !!this.audioContext;
  }
}