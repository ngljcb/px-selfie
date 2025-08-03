const supabase = require('../persistence/supabase');

async function register(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    }
  });
  if (error) throw error;

  const session = data.session;
  if (!session) throw new Error('No session returned from Supabase');

  const updateRes = await supabase.auth.updateUser(
    { data: { full_name: username } },
    { headers: { Authorization: `Bearer ${session.access_token}` } }
  );
  if (updateRes.error) throw updateRes.error;

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      username,
    },
    access_token: session.access_token,
  };
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  const session = data.session;
  if (!session) throw new Error('No session returned from Supabase');

  const user = data.user;

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.user_metadata?.full_name || null,
    },
    access_token: session.access_token,
  };
}

module.exports = { register, login };