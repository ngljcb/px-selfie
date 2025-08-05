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

  // NUOVO: Crea la riga iniziale per le statistiche dell'utente
  try {
    const { error: statsError } = await supabase
      .from('user_statistics')
      .insert([{ 
        user_id: data.user.id,
        total_completed_sessions: 0,
        total_study_time_minutes: 0,
        consecutive_study_days: 0,
        can_increment_streak: true,
        log_day: null
      }]);

    if (statsError) {
      console.error('Errore nella creazione delle statistiche iniziali:', statsError);
      // Non blocchiamo la registrazione per questo errore
    }
  } catch (statsError) {
    console.error('Errore nella creazione delle statistiche iniziali:', statsError);
  }

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

async function logout(access_token) {
  const { error } = await supabase.auth.signOut({
    headers: {
      Authorization: `Bearer ${access_token}`,
    }
  });

  if (error) throw error;
}

module.exports = { register, login, logout };