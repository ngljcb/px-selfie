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

  return {
    user: data.user,
    access_token: session.access_token
  };
}

module.exports = { register };