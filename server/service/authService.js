const authModel = require('../model/authModel');

async function register(email, password, username, name, birthday) {
  const { user, access_token } = await authModel.createAuthUser(email, password, username);
  await authModel.updateUserMetadata(access_token, { full_name: username });
  await authModel.createUserProfile(user.id, email, username, name, birthday);
  await authModel.createUserStatistics(user.id);
 
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
  const email = await authModel.findEmailByUsername(username);
  const { user, access_token } = await authModel.signInWithPassword(email, password);

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.user_metadata?.full_name || null,
    },
    access_token
  };
}

async function logout(access_token) {
  await authModel.signOut(access_token);
}

module.exports = { register, login, logout };