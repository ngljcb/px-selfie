const statisticsService = require('../service/statisticsService');

async function getStatistics(req, res) {
  try {
    const userId = req.user.id;
    
    const virtualTime = req.query.virtual_time || req.headers['x-virtual-time'];
    
    const statistics = await statisticsService.getUserStatistics(userId, virtualTime);
    
    res.status(200).json(statistics);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
}

async function updateSessionStats(req, res) {
  try {
    const userId = req.user.id;
    const { study_time_minutes } = req.body;

    const virtualTime = req.body.virtual_time || req.headers['x-virtual-time'];

    if (!study_time_minutes || study_time_minutes <= 0) {
      return res.status(400).json({ 
        error: 'study_time_minutes deve essere un numero positivo' 
      });
    }

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
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento delle statistiche' 
    });
  }
}

async function checkLoginStreak(req, res) {
  try {
    const userId = req.user.id;

    const virtualTime = req.body.virtual_time || req.headers['x-virtual-time'];

    if (virtualTime && isNaN(new Date(virtualTime).getTime())) {
      return res.status(400).json({ 
        error: 'virtual_time deve essere una data valida in formato ISO' 
      });
    }
    
    const streakInfo = await statisticsService.checkLoginStreak(userId, virtualTime);
    
    res.status(200).json(streakInfo);
  } catch (err) {
    res.status(500).json({ 
      error: 'Errore nel controllo del login streak' 
    });
  }
}

module.exports = {
  getStatistics,
  updateSessionStats,
  checkLoginStreak,
};