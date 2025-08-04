const statisticsService = require('../service/statisticsService');

async function getStatistics(req, res) {
  try {
    const userId = req.user.id; 
    const statistics = await statisticsService.getUserStatistics(userId);
    
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

    if (!study_time_minutes || study_time_minutes <= 0) {
      return res.status(400).json({ error: 'study_time_minutes deve essere un numero positivo' });
    }

    const updatedStats = await statisticsService.updateSessionCompleted(userId, study_time_minutes);
    
    res.status(200).json(updatedStats);
  } catch (err) {
    console.error('Errore nell\'aggiornamento statistiche sessione:', err);
    res.status(500).json({ error: 'Errore nell\'aggiornamento delle statistiche' });
  }
}

async function checkLoginStreak(req, res) {
  try {
    const userId = req.user.id;
    const streakInfo = await statisticsService.checkLoginStreak(userId);
    
    res.status(200).json(streakInfo);
  } catch (err) {
    console.error('Errore nel controllo login streak:', err);
    res.status(500).json({ error: 'Errore nel controllo del login streak' });
  }
}

module.exports = {
  getStatistics,
  updateSessionStats,
  checkLoginStreak
};
