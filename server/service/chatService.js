const { GoogleGenerativeAI } = require('@google/generative-ai');

const userChatSessions = new Map();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function createChatSession(userId) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    userChatSessions.set(userId, {
      chat,
      createdAt: new Date(),
      messageCount: 0
    });

    return true;
  } catch (error) {
    throw new Error('Impossibile creare la sessione chat');
  }
}

async function sendMessage(userId, message) {
  try {
    let userSession = userChatSessions.get(userId);

    if (!userSession) {
      await createChatSession(userId);
      userSession = userChatSessions.get(userId);
    }

    const result = await userSession.chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();

    userSession.messageCount++;

    return {
      success: true,
      response: responseText,
      messageCount: userSession.messageCount
    };
  } catch (error) {
    throw new Error('Errore nella comunicazione con l\'AI');
  }
}

function deleteSession(userId) {
  try {
    const deleted = userChatSessions.delete(userId);
    return deleted;
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendMessage,
  deleteSession,
};