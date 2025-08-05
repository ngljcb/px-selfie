const supabase = require('../persistence/supabase');

async function getUserStatistics(userId) {
  // Recupera o crea le statistiche dell'utente
  let { data: stats, error } = await supabase
    .from('user_statistics')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Record non trovato, crealo
    const { data: newStats, error: insertError } = await supabase
      .from('user_statistics')
      .insert([{ 
        user_id: userId,
        log_day: null,
        can_increment_streak: true
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    stats = newStats;
  } else if (error) {
    throw error;
  }

  return {
    totalCompletedSessions: stats.total_completed_sessions,
    totalStudyTimeMinutes: stats.total_study_time_minutes,
    totalStudyTimeFormatted: formatStudyTime(stats.total_study_time_minutes),
    consecutiveStudyDays: stats.consecutive_study_days
  };
}

async function checkLoginStreak(userId) {
  // Recupera i dati attuali
  let { data: stats, error } = await supabase
    .from('user_statistics')
    .select('log_day, consecutive_study_days, can_increment_streak')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Record non trovato, crealo
    const { data: newStats, error: insertError } = await supabase
      .from('user_statistics')
      .insert([{ 
        user_id: userId,
        log_day: null,
        can_increment_streak: true
      }])
      .select('log_day, consecutive_study_days, can_increment_streak')
      .single();

    if (insertError) throw insertError;
    stats = newStats;
  } else if (error) {
    throw error;
  }

  // Data di oggi
  const today = new Date();
  const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const logDay = stats.log_day; // Può essere null o una data
  let newConsecutiveDays = stats.consecutive_study_days;
  let canIncrementStreak = true;
  let streakWasReset = false;

  if (!logDay) {
    // Prima volta che si logga - imposta oggi come log_day
    canIncrementStreak = true;
  } else {
    // Calcola differenza in giorni tra oggi e ultimo login
    const logDate = new Date(logDay);
    const todayDate = new Date(todayDateString);
    const diffTime = todayDate.getTime() - logDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Stesso giorno - mantieni il flag attuale
      canIncrementStreak = stats.can_increment_streak;
    } else if (diffDays === 1) {
      // Giorno consecutivo - mantieni streak, abilita incremento
      canIncrementStreak = true;
    } else if (diffDays > 1) {
      // Gap > 1 giorno - reset streak, abilita incremento
      newConsecutiveDays = 0;
      canIncrementStreak = true;
      streakWasReset = true;
    } else {
      // Caso anomalo (diffDays < 0) - reset per sicurezza
      newConsecutiveDays = 0;
      canIncrementStreak = true;
      streakWasReset = true;
    }
  }

  // Aggiorna il database
  const { data: updatedStats, error: updateError } = await supabase
    .from('user_statistics')
    .update({
      log_day: todayDateString,
      consecutive_study_days: newConsecutiveDays,
      can_increment_streak: canIncrementStreak
    })
    .eq('user_id', userId)
    .select('consecutive_study_days')
    .single();

  if (updateError) throw updateError;

  return {
    logDay: todayDateString,
    canIncrementStreak,
    streakWasReset,
    currentStreak: updatedStats.consecutive_study_days
  };
}

async function updateSessionCompleted(userId, studyTimeMinutes) {
  try {
    console.log('Inizio updateSessionCompleted per userId:', userId, 'studyTimeMinutes:', studyTimeMinutes);

    // Recupera lo stato attuale per controllare il flag
    const { data: currentStats, error: fetchError } = await supabase
      .from('user_statistics')
      .select('can_increment_streak, consecutive_study_days, total_completed_sessions, total_study_time_minutes')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Errore nel recupero statistiche attuali:', fetchError);
      throw fetchError;
    }

    console.log('Statistiche attuali:', currentStats);

    const shouldIncrementStreak = currentStats.can_increment_streak;
    
    // Calcola i nuovi valori
    const newTotalSessions = (currentStats.total_completed_sessions || 0) + 1;
    const newTotalMinutes = (currentStats.total_study_time_minutes || 0) + studyTimeMinutes;
    const newConsecutiveDays = shouldIncrementStreak 
      ? (currentStats.consecutive_study_days || 0) + 1 
      : currentStats.consecutive_study_days;

    // Prepara l'oggetto di aggiornamento
    const updateData = {
      total_completed_sessions: newTotalSessions,
      total_study_time_minutes: newTotalMinutes
    };

    // Se può incrementare lo streak, lo incrementa e disabilita il flag
    if (shouldIncrementStreak) {
      updateData.consecutive_study_days = newConsecutiveDays;
      updateData.can_increment_streak = false;
    }

    console.log('Dati da aggiornare:', updateData);

    // Aggiorna le statistiche
    const { data, error } = await supabase
      .from('user_statistics')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Errore nell\'aggiornamento:', error);
      throw error;
    }

    console.log('Statistiche aggiornate con successo:', data);

    return {
      totalCompletedSessions: data.total_completed_sessions,
      totalStudyTimeMinutes: data.total_study_time_minutes,
      totalStudyTimeFormatted: formatStudyTime(data.total_study_time_minutes),
      consecutiveStudyDays: data.consecutive_study_days
    };

  } catch (error) {
    console.error('Errore completo in updateSessionCompleted:', error);
    throw error;
  }
}

// ==================== FUNZIONI HELPER ====================

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