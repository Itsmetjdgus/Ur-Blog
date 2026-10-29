(async function () {
  const header = document.getElementById('author-header');
  const list = document.getElementById('author-posts');
  const authorId = new URLSearchParams(window.location.search).get('id');

  if (!authorId) {
    header.textContent = 'User not found.';
    return;
  }

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, nickname')
    .eq('id', authorId)
    .maybeSingle();

  if (error || !profile) {
    header.textContent = 'User not found.';
    return;
  }

  document.title = profile.nickname + "'s Blog";

  const title = document.createElement('h2');
  title.textContent = profile.nickname + "'s Blog";
  header.innerHTML = '';
  header.append(title);

  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;
  const isMe = !!session && session.user.id === profile.id;

  if (isMe) {
    const form = document.getElementById('nickname-form');
    const input = document.getElementById('nickname');
    const button = document.getElementById('nickname-btn');
    const message = document.getElementById('nickname-message');

    form.hidden = false;
    input.value = profile.nickname;

    button.addEventListener('click', async () => {
      const nickname = input.value.trim();

      if (nickname.length < 2 || nickname.length > 20) {
        message.className = 'form-message';
        message.textContent = 'Nickname must be 2 to 20 characters.';
        return;
      }

      button.disabled = true;

      const { data: updated, error: updateError } = await db
        .from('profiles')
        .update({ nickname })
        .eq('id', profile.id)
        .select('nickname')
        .maybeSingle();

      button.disabled = false;

      if (updateError || !updated) {
        message.className = 'form-message';
        message.textContent = 'Failed to save nickname.';
        return;
      }

      title.textContent = updated.nickname + "'s Blog";
      message.className = 'form-message ok';
      message.textContent = 'Saved.';
    });
  }

  const { data: posts, error: postsError } = await db
    .from('posts')
    .select('id, title, content, created_at')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (postsError) {
    list.textContent = 'Failed to load posts.';
    return;
  }

  if (posts.length === 0) {
    list.textContent = 'No posts yet.';
    return;
  }

  posts.forEach((post) => list.append(renderPostCard(post, false)));
})();