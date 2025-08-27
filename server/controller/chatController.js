const chatService = require('../service/chatService');

async function sendMessage(req, res) {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Il messaggio non può essere vuoto'
      });
    }

    const result = await chatService.sendMessage(userId, message.trim());
    
    res.status(200).json({
      success: true,
      response: result.response,
      messageCount: result.messageCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Errore interno del server'
    });
  }
}

module.exports = {
  sendMessage
};