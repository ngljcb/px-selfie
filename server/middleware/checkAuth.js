const supabase = require('../persistence/supabase');
const cookie = require('cookie');

async function checkAuth(req, res, next) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.access_token;

  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Token non valido' });
  }

  req.user = data.user;
  next();
}

module.exports = checkAuth;