const emailInput = document.getElementById('email');
const sendBtn = document.getElementById('send-btn');
const message = document.getElementById('forgot-message');

sendBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();

  if (!email) {
    message.className = 'form-message';
    message.textContent = 'Please enter your email.';
    return;
  }

  sendBtn.disabled = true;
  message.className = 'form-message';
  message.textContent = 'Sending...';

  const redirectTo = new URL('reset.html', window.location.href).href;
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });

  sendBtn.disabled = false;

  if (error) {
    message.textContent = 'Could not send the email: ' + error.message;
    return;
  }

  message.className = 'form-message ok';
  message.textContent = 'If an account exists for this email, a reset link has been sent.';
});