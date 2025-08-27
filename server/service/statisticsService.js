const supabase = require('../persistence/supabase');

async function getUserStatistics(userId, virtualTime = null) {
  try {
    const currentTime = virtualTime ? new Date(virtualTime) : new Date();
    
    const { data: historyRecords, error } = await supabase
      .from('stats_history')
      .select('*')
      .eq('user_id', userId)
      .lte('updated_at', currentTime.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (!historyRecords || historyRecords.length === 0) {
      return {
        totalCompletedSessions: 0,
        totalStudyTimeMinutes: 0,
        totalStudyTimeFormatted: '0m',
        consecutiveStudyDays: 0
      };
    }

    const totalSessions = historyRecords.reduce((sum, record) => 
      sum + record.total_completed_sessions, 0);
    
    const totalMinutes = historyRecords.reduce((sum, record) => 
      sum + record.total_study_time_minutes, 0);

    const consecutiveDays = calculateConsecutiveStreak(historyRecords, currentTime);

    const result = {
      totalCompletedSessions: totalSessions,
      totalStudyTimeMinutes: totalMinutes,
      totalStudyTimeFormatted: formatStudyTime(totalMinutes),
      consecutiveStudyDays: consecutiveDays
    };

    return result;

  } catch (error) {
    throw error;
  }
}

async function updateSessionCompleted(userId, studyTimeMinutes, virtualTime = null) {
  try {
    let timestampToUse;
    if (virtualTime) {
      timestampToUse = virtualTime; 
    } else {
      timestampToUse = new Date().toISOString();
    }

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
      throw error;
    }

    const timeForStats = virtualTime || new Date().toISOString();
    return await getUserStatistics(userId, timeForStats);

  } catch (error) {
    throw error;
  }
}

async function checkLoginStreak(userId, virtualTime = null) {
  try {
    const currentTime = virtualTime ? new Date(virtualTime) : new Date();
    const todayDateString = currentTime.toISOString().split('T')[0]; 

    const { data: historyRecords, error } = await supabase
      .from('stats_history')
      .select('updated_at')
      .eq('user_id', userId)
      .lte('updated_at', currentTime.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      throw error;
    }

    let canIncrementStreak = true;
    let streakWasReset = false;
    let currentStreak = 0;

    if (historyRecords && historyRecords.length > 0) {
      const todayHasRecord = historyRecords.some(record => 
        record.updated_at.startsWith(todayDateString)
      );

      if (todayHasRecord) {
        canIncrementStreak = false;
      } else {
        canIncrementStreak = true;
      }

      currentStreak = calculateConsecutiveStreak(historyRecords, currentTime);
    }

    return {
      canIncrementStreak,
      streakWasReset,
      currentStreak
    };

  } catch (error) {
    throw error;
  }
}

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

  const studyDaysSet = new Set();
  historyRecords.forEach(record => {
    const day = record.updated_at.split('T')[0]; 
    studyDaysSet.add(day);
  });

  const currentDate = new Date(currentTime);
  let streakDays = 0;
  let checkDate = new Date(currentDate);

  while (true) {
    const checkDateString = checkDate.toISOString().split('T')[0];
    
    if (studyDaysSet.has(checkDateString)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streakDays;
}

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