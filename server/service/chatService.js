const { GoogleGenerativeAI } = require('@google/generative-ai');

// Mappa per memorizzare le sessioni chat per ogni utente (in memoria)
const userChatSessions = new Map();

// Inizializza Gemini AI con la chiave API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function createChatSession(userId) {
  try {
    // Cambiato da 'gemini-pro' a 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Configurazione della chat
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Ciao, sono uno studente universitario che usa l\'applicazione SELFIE per organizzare i miei studi. Puoi aiutarmi con domande di studio, pianificazione del tempo e consigli generali?' }]
        },
        {
          role: 'model',
          parts: [{ text: 'Ciao! Sono il tuo assistente AI per SELFIE. Sono qui per aiutarti con i tuoi studi, la pianificazione del tempo, organizzazione delle attività e qualsiasi domanda tu possa avere. Chiedi pure!' }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Salva la sessione per l'utente
    userChatSessions.set(userId, {
      chat,
      createdAt: new Date(),
      messageCount: 0
    });

    console.log(`Chat session creata per user ${userId}`);
    return true;
  } catch (error) {
    console.error('Errore nella creazione della chat session:', error);
    throw new Error('Impossibile creare la sessione chat');
  }
}

async function sendMessage(userId, message) {
  try {
    let userSession = userChatSessions.get(userId);
    
    // Se non esiste una sessione, la crea automaticamente
    if (!userSession) {
      console.log(`Creazione automatica sessione chat per user ${userId}`);
      await createChatSession(userId);
      userSession = userChatSessions.get(userId);
    }

    // Invia il messaggio alla chat
    const result = await userSession.chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();

    // Incrementa il contatore dei messaggi
    userSession.messageCount++;

    return {
      success: true,
      response: responseText,
      messageCount: userSession.messageCount
    };
  } catch (error) {
    console.error('Errore nell\'invio del messaggio:', error);
    throw new Error('Errore nella comunicazione con l\'AI');
  }
}

function deleteSession(userId) {
  try {
    const deleted = userChatSessions.delete(userId);
    if (deleted) {
      console.log(`Chat session eliminata per user ${userId}`);
    }
    return deleted;
  } catch (error) {
    console.error('Errore nell\'eliminazione della chat session:', error);
    return false;
  }
}

module.exports = {
  sendMessage,
  deleteSession,
};