(function () {
  const form = document.getElementById('reset-form');
  const info = document.getElementById('reset-info');
  const message = document.getElementById('reset-message');
  const newInput = document.getElementById('new-password');
  const confirmInput = document.getElementById('confirm-password');
  const button = document.getElementById('reset-btn');

  if (window.location.hash.includes('error')) {
    info.textContent = 'This reset link is invalid or has expired. Please request a new one.';
    return;
  }

  let ready = false;

  db.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      ready = true;
      info.textContent = 'Enter your new password.';
      form.hidden = false;
    }
  });

  setTimeout(() => {
    if (!ready) {
      info.textContent = 'Open this page from the link in your reset email. You can request a new link on the Forgot password page.';
    }
  }, 4000);

  button.addEventListener('click', async () => {
    message.className = 'form-message';

    if (newInput.value.length < 8) {
      message.textContent = 'Password must be at least 8 characters.';
      return;
    }

    if (newInput.value !== confirmInput.value) {
      message.textContent = 'Passwords do not match.';
      return;
    }

    button.disabled = true;
    message.textContent = 'Updating...';

    const { error } = await db.auth.updateUser({ password: newInput.value });

    if (error) {
      message.textContent = error.message;
      button.disabled = false;
      return;
    }

    message.className = 'form-message ok';
    message.textContent = 'Password updated. Redirecting...';

    setTimeout(() => {
      window.location.href = 'blog.html';
    }, 1500);
  });
})();