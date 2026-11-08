(async function () {
  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const status = document.getElementById('privacy-status');
  const options = document.getElementById('privacy-options');
  const saveBtn = document.getElementById('privacy-save');
  const message = document.getElementById('privacy-message');
  const radios = document.querySelectorAll('input[name="privacy"]');

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, is_private')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !profile) {
    status.textContent = 'Failed to load your settings.';
    return;
  }

  let current = profile.is_private ? 'private' : 'public';

  function showCurrent() {
    status.className = 'state-message';
    status.textContent = 'Your account is currently ' + current + '.';
    radios.forEach((radio) => {
      radio.checked = radio.value === current;
    });
  }

  showCurrent();
  options.hidden = false;

  saveBtn.addEventListener('click', async () => {
    message.className = 'form-message';

    const selected = document.querySelector('input[name="privacy"]:checked');
    if (!selected) {
      message.textContent = 'Please choose an option.';
      return;
    }

    if (selected.value === current) {
      message.textContent = 'No changes to save.';
      return;
    }

    const goingPublic = selected.value === 'public';
    const warning = goingPublic
      ? 'Switch to Public? Everyone will be able to see your posts, and all pending follow requests will be approved.'
      : 'Switch to Private? People who do not follow you will no longer see your posts. Your current followers keep access.';

    if (!confirm(warning)) return;

    saveBtn.disabled = true;

    const { data, error: updateError } = await db
      .from('profiles')
      .update({ is_private: !goingPublic })
      .eq('id', session.user.id)
      .select('is_private')
      .maybeSingle();

    saveBtn.disabled = false;

    if (updateError || !data) {
      message.textContent = 'Failed to save.';
      return;
    }

    current = data.is_private ? 'private' : 'public';
    showCurrent();
    message.className = 'form-message ok';
    message.textContent = 'Saved.';
  });
})();