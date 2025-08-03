const authService = require('../service/authService');
const supabase = require('../persistence/supabase');
const cookie = require('cookie');

async function register(req, res) {
  const { email, password, username } = req.body;

  try {
    const { user, access_token } = await authService.register(email, password, username);

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
  const { email, password } = req.body;

  try {
    const { user, access_token } = await authService.login(email, password);

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

module.exports = { register, login, me };
