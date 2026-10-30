const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const message = document.getElementById('auth-message');

document.getElementById('signup-btn').addEventListener('click', async () => {
  if (passwordInput.value.length < 8) {
    message.textContent = 'Password must be at least 8 characters.';
    return;
  }

  message.textContent = 'Signing up...';

  const { data, error } = await db.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  if (data.session) {
    window.location.href = 'blog.html';
  } else {
    message.textContent = 'Check your email to confirm your account.';
  }
});

document.getElementById('login-btn').addEventListener('click', async () => {
  message.textContent = 'Logging in...';

  const { error } = await db.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  window.location.href = 'blog.html';
});