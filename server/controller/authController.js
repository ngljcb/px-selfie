const authService = require('../service/authService');
const supabase = require('../persistence/supabase');
const cookie = require('cookie');
const chatService = require('../service/chatService');

async function register(req, res) {
  const { email, password, username, name, birthday } = req.body;

  if (!email || !password || !username || !name || !birthday) {
    return res.status(400).json({ error: 'All fields are required: email, password, username, name, birthday' });
  }

  try {
    const { user, access_token } = await authService.register(email, password, username, name, birthday);

    res.setHeader('Set-Cookie', cookie.serialize('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    }));

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  const { username, password } = req.body;

  try {
    const { user, access_token } = await authService.login(username, password);

    res.setHeader('Set-Cookie', cookie.serialize('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    }));

    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

async function me(req, res) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const access_token = cookies.access_token;

  if (!access_token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token non valido' });
  }

  const user = data.user;
  res.status(200).json({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username || user.user_metadata?.full_name || null
  });
}

async function logout(req, res) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const access_token = cookies.access_token;

  if (!access_token) {
    return res.status(400).json({ error: 'Token non presente nel cookie' });
  }
  else {
    const { data } = await supabase.auth.getUser(access_token);
    if (data?.user?.id) {
      chatService.deleteSession(data.user.id);
    }
  }

  try {
    await authService.logout(access_token);

    // Cancella il cookie
    res.setHeader('Set-Cookie', cookie.serialize('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      expires: new Date(0),
      path: '/',
    }));

    res.status(200).json({ message: 'Logout effettuato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, logout, me };
