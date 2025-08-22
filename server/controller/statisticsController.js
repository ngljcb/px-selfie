const statisticsService = require('../service/statisticsService');

/**
 * Controller per gestire le statistiche con supporto Time Machine
 * Gestisce il parametro opzionale virtual_time per simulare operazioni in tempi diversi
 */

async function getStatistics(req, res) {
  try {
    const userId = req.user.id;
    
    // Controlla se è stato fornito un tempo virtuale
    const virtualTime = req.query.virtual_time || req.headers['x-virtual-time'];
    
    console.log('Recupero statistiche per userId:', userId, 
                'virtualTime:', virtualTime || 'tempo reale');
    
    const statistics = await statisticsService.getUserStatistics(userId, virtualTime);
    
    res.status(200).json(statistics);
  } catch (err) {
    console.error('Errore nel recupero statistiche:', err);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
}

async function updateSessionStats(req, res) {
  try {
    const userId = req.user.id;
    const { study_time_minutes } = req.body;
    
    // Controlla se è stato fornito un tempo virtuale
    const virtualTime = req.body.virtual_time || req.headers['x-virtual-time'];

    console.log('Aggiornamento sessione per userId:', userId, 
                'studyTimeMinutes:', study_time_minutes,
                'virtualTime:', virtualTime || 'tempo reale');

    // Validazione input
    if (!study_time_minutes || study_time_minutes <= 0) {
      return res.status(400).json({ 
        error: 'study_time_minutes deve essere un numero positivo' 
      });
    }

    // Validazione tempo virtuale se fornito
    if (virtualTime && isNaN(new Date(virtualTime).getTime())) {
      return res.status(400).json({ 
        error: 'virtual_time deve essere una data valida in formato ISO' 
      });
    }

    const updatedStats = await statisticsService.updateSessionCompleted(
      userId, 
      study_time_minutes, 
      virtualTime
    );
    
    res.status(200).json(updatedStats);
  } catch (err) {
    console.error('Errore nell\'aggiornamento statistiche sessione:', err);
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento delle statistiche' 
    });
  }
}

async function checkLoginStreak(req, res) {
  try {
    const userId = req.user.id;
    
    // Controlla se è stato fornito un tempo virtuale
    const virtualTime = req.body.virtual_time || req.headers['x-virtual-time'];
    
    console.log('Controllo login streak per userId:', userId,
                'virtualTime:', virtualTime || 'tempo reale');

    // Validazione tempo virtuale se fornito
    if (virtualTime && isNaN(new Date(virtualTime).getTime())) {
      return res.status(400).json({ 
        error: 'virtual_time deve essere una data valida in formato ISO' 
      });
    }
    
    const streakInfo = await statisticsService.checkLoginStreak(userId, virtualTime);
    
    res.status(200).json(streakInfo);
  } catch (err) {
    console.error('Errore nel controllo login streak:', err);
    res.status(500).json({ 
      error: 'Errore nel controllo del login streak' 
    });
  }
}

/**
 * Nuovo endpoint per recuperare la cronologia completa delle statistiche
 * Utile per debug e visualizzazioni avanzate
 */
async function getStatisticsHistory(req, res) {
  try {
    const userId = req.user.id;
    const virtualTime = req.query.virtual_time || req.headers['x-virtual-time'];
    
    // Questo endpoint potrebbe essere utile per visualizzazioni avanzate
    // Per ora ritorna semplicemente le statistiche aggregate
    const statistics = await statisticsService.getUserStatistics(userId, virtualTime);
    
    res.status(200).json({
      message: 'Cronologia delle statistiche',
      statistics,
      virtualTime: virtualTime || null
    });
  } catch (err) {
    console.error('Errore nel recupero cronologia statistiche:', err);
    res.status(500).json({ 
      error: 'Errore nel recupero della cronologia delle statistiche' 
    });
  }
}

module.exports = {
  getStatistics,
  updateSessionStats,
  checkLoginStreak,
  getStatisticsHistory
};