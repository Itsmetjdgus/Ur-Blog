(async function () {
  const privacyNote = document.getElementById('privacy-note');
  if (!privacyNote) return;

  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;
  if (!session) return;

  const { data: me } = await db
    .from('profiles')
    .select('is_private')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!me) return;

  privacyNote.append(
    me.is_private
      ? 'Your account is private. Only people you approve can see your posts. Photos are not fully protected yet, so please do not attach photos. '
      : 'Your account is public. Anyone can see your posts. '
  );

  const changeLink = document.createElement('a');
  changeLink.href = 'settings.html';
  changeLink.textContent = 'Change in Settings.';
  privacyNote.append(changeLink);
})();