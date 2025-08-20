const supabase = require('../persistence/supabase');

/**
 * Service per gestire le statistiche con supporto Time Machine
 * Il database stats_history contiene una cronologia di tutte le sessioni completate
 * Lo streak viene calcolato dinamicamente andando a ritroso dal giorno corrente
 */

async function getUserStatistics(userId, virtualTime = null) {
  try {
    // Usa il tempo virtuale se fornito, altrimenti usa il tempo reale
    const currentTime = virtualTime ? new Date(virtualTime) : new Date();
    
    console.log('getUserStatistics chiamata con:', {
      userId,
      virtualTime,
      currentTime: currentTime.toISOString()
    });
    
    // Recupera tutti i record fino al tempo corrente (reale o virtuale)
    const { data: historyRecords, error } = await supabase
      .from('stats_history')
      .select('*')
      .eq('user_id', userId)
      .lte('updated_at', currentTime.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('Errore nel recupero cronologia statistiche:', error);
      throw error;
    }

    console.log('Record trovati:', historyRecords?.length || 0, 'fino a', currentTime.toISOString());

    // Se non ci sono record, ritorna statistiche vuote
    if (!historyRecords || historyRecords.length === 0) {
      console.log('Nessun record trovato, ritornando statistiche vuote');
      return {
        totalCompletedSessions: 0,
        totalStudyTimeMinutes: 0,
        totalStudyTimeFormatted: '0m',
        consecutiveStudyDays: 0
      };
    }

    // Calcola le statistiche totali sommando tutti i record
    const totalSessions = historyRecords.reduce((sum, record) => 
      sum + record.total_completed_sessions, 0);
    
    const totalMinutes = historyRecords.reduce((sum, record) => 
      sum + record.total_study_time_minutes, 0);

    // Calcola lo streak consecutivo con la nuova logica semplificata
    const consecutiveDays = calculateConsecutiveStreak(historyRecords, currentTime);

    const result = {
      totalCompletedSessions: totalSessions,
      totalStudyTimeMinutes: totalMinutes,
      totalStudyTimeFormatted: formatStudyTime(totalMinutes),
      consecutiveStudyDays: consecutiveDays
    };

    console.log('Statistiche calcolate:', result);
    return result;

  } catch (error) {
    console.error('Errore completo in getUserStatistics:', error);
    throw error;
  }
}

async function updateSessionCompleted(userId, studyTimeMinutes, virtualTime = null) {
  try {
    console.log('Aggiornamento sessione per userId:', userId, 
                'studyTimeMinutes:', studyTimeMinutes, 
                'virtualTime ricevuto:', virtualTime);

    // CORREZIONE DEFINITIVA TIMEZONE: Usa direttamente la stringa ISO senza conversioni
    let timestampToUse;
    if (virtualTime) {
      // Se virtualTime è fornito, usalo direttamente senza conversioni Date
      timestampToUse = virtualTime; // Mantieni la stringa ISO esatta
      console.log('Usando timestamp virtuale diretto:', timestampToUse);
    } else {
      // Solo se non c'è virtual time, usa il tempo reale
      timestampToUse = new Date().toISOString();
      console.log('Usando timestamp reale:', timestampToUse);
    }

    // Inserisce un nuovo record nella cronologia
    const { data, error } = await supabase
      .from('stats_history')
      .insert([{
        user_id: userId,
        total_completed_sessions: 1,
        total_study_time_minutes: studyTimeMinutes,
        updated_at: timestampToUse
      }])
      .select()
      .single();

    if (error) {
      console.error('Errore nell\'inserimento nuovo record:', error);
      throw error;
    }

    console.log('Nuovo record inserito:', data);

    // Per il calcolo delle statistiche aggiornate, usa il timestamp che è stato effettivamente salvato
    const timeForStats = virtualTime || new Date().toISOString();
    return await getUserStatistics(userId, timeForStats);

  } catch (error) {
    console.error('Errore completo in updateSessionCompleted:', error);
    throw error;
  }
}

async function checkLoginStreak(userId, virtualTime = null) {
  try {
    // Usa il tempo virtuale se fornito, altrimenti usa il tempo reale
    const currentTime = virtualTime ? new Date(virtualTime) : new Date();
    const todayDateString = currentTime.toISOString().split('T')[0]; // YYYY-MM-DD

    // Recupera tutti i record dell'utente
    const { data: historyRecords, error } = await supabase
      .from('stats_history')
      .select('updated_at')
      .eq('user_id', userId)
      .lte('updated_at', currentTime.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('Errore nel recupero cronologia per streak:', error);
      throw error;
    }

    let canIncrementStreak = true;
    let streakWasReset = false;
    let currentStreak = 0;

    if (historyRecords && historyRecords.length > 0) {
      // Controlla se oggi ha già almeno un record (sessione completata)
      const todayHasRecord = historyRecords.some(record => 
        record.updated_at.startsWith(todayDateString)
      );

      if (todayHasRecord) {
        // Già studiato oggi, non può incrementare lo streak
        canIncrementStreak = false;
      } else {
        // Non ha ancora studiato oggi, può incrementare lo streak
        canIncrementStreak = true;
      }

      // Calcola lo streak attuale
      currentStreak = calculateConsecutiveStreak(historyRecords, currentTime);
    }

    return {
      canIncrementStreak,
      streakWasReset,
      currentStreak
    };

  } catch (error) {
    console.error('Errore completo in checkLoginStreak:', error);
    throw error;
  }
}

// ==================== FUNZIONI HELPER ====================

/**
 * Calcola lo streak consecutivo di giorni di studio
 * NUOVA LOGICA SEMPLIFICATA: partendo dal giorno corrente vai a ritroso
 * Se il giorno precedente non ha record → streak reset a 1 (solo oggi conta)
 * Se ha record → +1 e continua a controllare il giorno prima
 */
function calculateConsecutiveStreak(historyRecords, currentTime) {
  if (!historyRecords || historyRecords.length === 0) {
    return 0;
  }

  // Crea un Set dei giorni che hanno almeno un record (sessione completata)
  const studyDaysSet = new Set();
  historyRecords.forEach(record => {
    const day = record.updated_at.split('T')[0]; // YYYY-MM-DD
    studyDaysSet.add(day);
  });

  // Parte dal giorno corrente e va a ritroso
  const currentDate = new Date(currentTime);
  let streakDays = 0;
  let checkDate = new Date(currentDate);

  // Controlla ogni giorno partendo da oggi
  while (true) {
    const checkDateString = checkDate.toISOString().split('T')[0];
    
    if (studyDaysSet.has(checkDateString)) {
      // C'è almeno una sessione in questo giorno
      streakDays++;
      // Vai al giorno precedente
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Nessuna sessione in questo giorno - streak interrotto
      break;
    }
  }

  return streakDays;
}

/**
 * Formatta il tempo di studio in formato leggibile
 */
function formatStudyTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

module.exports = {
  getUserStatistics,
  updateSessionCompleted,
  checkLoginStreak
};