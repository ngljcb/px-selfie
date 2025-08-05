const supabase = require('../persistence/supabase');

// Helper function per ottenere la data locale in formato YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  // Usa il timezone locale del server invece di UTC
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function per calcolare differenza in giorni tra due date (solo parte data)
function calculateDaysDifference(dateString1, dateString2) {
  // Crea date objects solo con la parte data (ore = 00:00:00)
  const date1 = new Date(dateString1 + 'T00:00:00');
  const date2 = new Date(dateString2 + 'T00:00:00');
  
  const diffTime = date2.getTime() - date1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

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

  // Data di oggi (timezone locale del server)
  const todayDateString = getTodayDateString();
  
  const logDay = stats.log_day; // Può essere null o una data
  let newConsecutiveDays = stats.consecutive_study_days;
  let canIncrementStreak = true;
  let streakWasReset = false;

  if (!logDay) {
    // Prima volta che si logga - imposta oggi come log_day
    canIncrementStreak = true;
  } else {
    // Calcola differenza in giorni tra oggi e ultimo login
    const diffDays = calculateDaysDifference(logDay, todayDateString);

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
    } else if (diffDays < 0) {
      // Caso anomalo: logDay è nel futuro - reset per sicurezza
      console.warn(`Anomalia: logDay (${logDay}) è nel futuro rispetto a oggi (${todayDateString})`);
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
  // Recupera lo stato attuale per controllare il flag
  const { data: currentStats, error: fetchError } = await supabase
    .from('user_statistics')
    .select('can_increment_streak, consecutive_study_days')
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;

  const shouldIncrementStreak = currentStats.can_increment_streak;
  
  // Prepara l'aggiornamento
  const updateData = {
    user_id: userId,
    total_completed_sessions: supabase.raw('COALESCE(total_completed_sessions, 0) + 1'),
    total_study_time_minutes: supabase.raw(`COALESCE(total_study_time_minutes, 0) + ${studyTimeMinutes}`)
  };

  // Se può incrementare lo streak, lo incrementa e disabilita il flag
  if (shouldIncrementStreak) {
    updateData.consecutive_study_days = supabase.raw('COALESCE(consecutive_study_days, 0) + 1');
    updateData.can_increment_streak = false;
  }

  // Aggiorna le statistiche
  const { data, error } = await supabase
    .from('user_statistics')
    .upsert(updateData, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;

  return {
    totalCompletedSessions: data.total_completed_sessions,
    totalStudyTimeMinutes: data.total_study_time_minutes,
    totalStudyTimeFormatted: formatStudyTime(data.total_study_time_minutes),
    consecutiveStudyDays: data.consecutive_study_days
  };
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