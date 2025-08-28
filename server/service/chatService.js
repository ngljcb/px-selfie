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
          parts: [{ text: 'Hi, I\'m a university student using the SELFIE app to organize my studies. Can you help me with study questions, time planning and general advice?' }]
        },
        {
          role: 'model',
          parts: [{ text: 'Hi! I\'m your AI assistant for SELFIE. I\'m here to help you with your studies, time planning, activity organization and any questions you might have. Feel free to ask!' }]
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
    throw new Error('Unable to create chat session');
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
    throw new Error('Error communicating with AI');
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