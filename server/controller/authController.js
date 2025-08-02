const authService = require('../service/authService');
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

module.exports = { register };
