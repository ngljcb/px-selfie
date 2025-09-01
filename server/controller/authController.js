// auth.controller.js
const authService = require('../service/authService');
const supabase = require('../persistence/supabase');
const cookie = require('cookie');
const chatService = require('../service/chatService');

const isProd = process.env.NODE_ENV === 'production';

const AUTH_COOKIE = 'access_token';
const ONE_DAY = 60 * 60 * 24;

const cookieOptions = {
  httpOnly: true,
  secure: isProd,                 // richiesto da SameSite=None
  sameSite: isProd ? 'none' : 'lax', // in prod deve essere 'none' per cross-site
  path: '/',
  maxAge: ONE_DAY,
  // se vuoi renderlo leggibile su più sottodomini, valuta:
  // domain: '.vercel.app', // opzionale, di solito NON serve: basta il dominio del backend
};

async function register(req, res) {
  const { email, password, username, name, birthday } = req.body;
  if (!email || !password || !username || !name || !birthday) {
    return res.status(400).json({ error: 'All fields are required: email, password, username, name, birthday' });
  }

  try {
    const { user, access_token } = await authService.register(email, password, username, name, birthday);

    res.setHeader('Set-Cookie', cookie.serialize(AUTH_COOKIE, access_token, cookieOptions));
    return res.status(201).json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const { user, access_token } = await authService.login(username, password);

    res.setHeader('Set-Cookie', cookie.serialize(AUTH_COOKIE, access_token, cookieOptions));
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}

async function me(req, res) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const access_token = cookies[AUTH_COOKIE];

  if (!access_token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data?.user) return res.status(401).json({ error: 'Token non valido' });

  const user = data.user;
  return res.status(200).json({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username || user.user_metadata?.full_name || null,
  });
}

async function logout(req, res) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const access_token = cookies[AUTH_COOKIE];

  if (!access_token) {
    return res.status(400).json({ error: 'Token non presente nel cookie' });
  } else {
    const { data } = await supabase.auth.getUser(access_token);
    if (data?.user?.id) {
      chatService.deleteSession(data.user.id);
    }
  }

  try {
    await authService.logout(access_token);

    // Svuota il cookie
    res.setHeader('Set-Cookie', cookie.serialize(AUTH_COOKIE, '', {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    }));

    return res.status(200).json({ message: 'Logout effettuato con successo' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, logout, me };
