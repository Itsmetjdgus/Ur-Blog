const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const message = document.getElementById('auth-message');

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
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

document.getElementById('open-signup-btn').addEventListener('click', openSignup);