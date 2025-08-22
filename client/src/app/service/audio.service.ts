// src/app/features/timer/services/audio.service.ts

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

  /**
   * Suono per fine fase di studio - tono più lungo e rilassante
   */
  playStudyCompleteSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // Sequenza di toni: Do - Mi - Sol (accordo maggiore rilassante)
      this.playToneSequence([
        { frequency: 523.25, duration: 0.3, delay: 0 },     // Do
        { frequency: 659.25, duration: 0.3, delay: 0.1 },   // Mi  
        { frequency: 783.99, duration: 0.5, delay: 0.2 }    // Sol (più lungo)
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono studio:', error);
    }
  }

  /**
   * Suono per fine pausa - tono più energico per riprendere
   */
  playBreakCompleteSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // Sequenza ascendente energica
      this.playToneSequence([
        { frequency: 440, duration: 0.15, delay: 0 },      // La
        { frequency: 554.37, duration: 0.15, delay: 0.1 }, // Do#
        { frequency: 659.25, duration: 0.15, delay: 0.2 }, // Mi
        { frequency: 880, duration: 0.4, delay: 0.3 }      // La alto (più lungo)
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono pausa:', error);
    }
  }

  /**
   * Suono per sessione completata - celebrativo
   */
  playSessionCompleteSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // Arpeggio celebrativo: Do - Mi - Sol - Do alto
      this.playToneSequence([
        { frequency: 523.25, duration: 0.2, delay: 0 },    // Do
        { frequency: 659.25, duration: 0.2, delay: 0.15 }, // Mi
        { frequency: 783.99, duration: 0.2, delay: 0.3 },  // Sol
        { frequency: 1046.5, duration: 0.6, delay: 0.45 }  // Do alto (lungo)
      ]);
    } catch (error) {
      console.warn('Errore riproduzione suono completamento:', error);
    }
  }

  /**
   * Suono per fase saltata - neutro/informativo
   */
  playPhaseSkippedSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // Due toni rapidi e discreti
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

      // Connessioni
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      // Configurazione oscillatore
      oscillator.type = 'sine'; // Suono morbido e piacevole
      oscillator.frequency.setValueAtTime(tone.frequency, now + tone.delay);

      // Envelope per evitare click: fade in/out
      gainNode.gain.setValueAtTime(0, now + tone.delay);
      gainNode.gain.linearRampToValueAtTime(0.1, now + tone.delay + 0.01); // Volume moderato
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + tone.delay + tone.duration);

      // Riproduzione
      oscillator.start(now + tone.delay);
      oscillator.stop(now + tone.delay + tone.duration);
    });
  }

  /**
   * Abilita/disabilita i suoni
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Verifica se i suoni sono abilitati
   */
  isAudioEnabled(): boolean {
    return this.isEnabled && !!this.audioContext;
  }
}