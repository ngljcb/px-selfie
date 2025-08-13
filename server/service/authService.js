const supabase = require('../persistence/supabase');

async function register(email, password, username, name, birthday) {
  const { user, access_token } = await createAuthUser(email, password, username);

  await updateUserMetadata(access_token, { full_name: username });

  await createUserProfile(user.id, email, username, name, birthday);

  await createUserStatistics(user.id);
 
  return {
    user: {
      id: user.id,
      email: user.email,
      username
    },
    access_token
  };
}

async function login(username, password) {
  const email = await findEmailByUsername(username);

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

async function createAuthUser(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });
  if (error) throw error;
  if (!data.session) throw new Error('No session returned from Supabase');

  return {
    user: data.user,
    access_token: data.session.access_token
  };
}

async function updateUserMetadata(access_token, metadata) {
  const { error } = await supabase.auth.updateUser(
    { data: metadata },
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (error) throw error;
}

async function createUserProfile(id, email, username, name, birthday) {
  const { error } = await supabase
    .from('profiles')
    .insert({
      id,
      email,
      username,
      name,
      birthday
    });

  if (error) throw error;
}

async function findEmailByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username)
    .limit(1)
    .single();

  if (error || !data?.email) {
    throw new Error('Utente non trovato.');
  }

  return data.email;
}

async function createUserStatistics(userId) {
   // NUOVO: Crea la riga iniziale per le statistiche dell'utente
  try {
    const { error: statsError } = await supabase
      .from('user_statistics')
      .insert([{ 
        user_id: data.user.id
      }]);
    if (statsError) {
      console.error('Errore nella creazione delle statistiche iniziali:', statsError);
      // Non blocchiamo la registrazione per questo errore
    }
  } catch (statsError) {
    console.error('Errore nella creazione delle statistiche iniziali:', statsError);
  }
}

module.exports = { register, login, logout };