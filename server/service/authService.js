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
    {
      data: {
        full_name: username, // questo popola la colonna "Display name"
      },
    },
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
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

module.exports = { register };