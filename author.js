(async function () {
  const header = document.getElementById('author-header');
  const list = document.getElementById('author-posts');
  const authorId = new URLSearchParams(window.location.search).get('id');

  if (!authorId) {
   header.textContent = t('profile.not_found');
    return;
  }

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, nickname')
    .eq('id', authorId)
    .maybeSingle();

  if (error || !profile) {
    header.textContent = t('profile.not_found');
    return;
  }

    document.title = profile.nickname + ' - Tidnote';

  header.innerHTML = '';
  const postsHeading = document.getElementById('posts-heading');
  postsHeading.textContent = t('profile.posts_of', { name: profile.nickname });

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
        if (updateError && updateError.code === '23505') {
          message.textContent = 'That nickname is already taken.';
        } else {
          message.textContent = 'Failed to save nickname.';
        }
        return;
      }

            postsHeading.textContent = t('profile.posts_of', { name: updated.nickname });
      document.dispatchEvent(new CustomEvent('nickname-changed', { detail: updated.nickname }));
      message.className = 'form-message ok';
      message.textContent = 'Saved.';
    });

    const danger = document.getElementById('danger-zone');
    const deleteBtn = document.getElementById('delete-account-btn');
    const deleteConfirm = document.getElementById('delete-confirm');
    const deleteMessage = document.getElementById('delete-message');

    danger.hidden = false;

    deleteBtn.addEventListener('click', async () => {
      if (deleteConfirm.value !== 'DELETE') {
        deleteMessage.textContent = 'Type DELETE to confirm.';
        return;
      }

      if (!confirm('Delete your account permanently?')) return;

      deleteBtn.disabled = true;
      deleteMessage.textContent = 'Deleting...';

      const { data: myPosts, error: postsError } = await db
        .from('posts')
        .select('image_path')
        .eq('author_id', session.user.id)
        .not('image_path', 'is', null);

      if (postsError) {
        deleteMessage.textContent = 'Failed to delete the account.';
        deleteBtn.disabled = false;
        return;
      }

      const paths = myPosts.map((p) => p.image_path);
      if (paths.length > 0) {
        const { error: removeError } = await db.storage.from('post-images').remove(paths);
        if (removeError) {
          deleteMessage.textContent = 'Failed to delete images.';
          deleteBtn.disabled = false;
          return;
        }
      }

      const { error: rpcError } = await db.rpc('delete_my_account');
      if (rpcError) {
        deleteMessage.textContent = 'Failed to delete the account.';
        deleteBtn.disabled = false;
        return;
      }

      try {
        await db.auth.signOut();
      } catch (e) {}

      window.location.href = 'index.html';
    });
  }

  const { data: posts, error: postsError } = await db
    .from('posts')
    .select('id, title, content, created_at, image_path')
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