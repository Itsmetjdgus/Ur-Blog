(async function () {
  const section = document.getElementById('comments');
  const postId = Number(new URLSearchParams(window.location.search).get('id'));
  if (!section || !postId) return;

  const { data: sessionData } = await db.auth.getSession();
  const me = sessionData.session ? sessionData.session.user.id : null;

  const { data: post } = await db
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .maybeSingle();

  if (!post) return;

  const heading = document.createElement('h3');
  const list = document.createElement('div');
  section.append(heading, list);

  async function loadComments() {
    const { data, error } = await db
      .from('comments')
      .select('id, content, author_id, created_at, profiles(nickname)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    list.innerHTML = '';

    if (error) {
      list.textContent = 'Failed to load comments.';
      return;
    }

    heading.textContent = 'Comments (' + data.length + ')';

    if (data.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'state-message';
      empty.textContent = 'No comments yet.';
      list.append(empty);
      return;
    }

    data.forEach((comment) => list.append(renderComment(comment)));
  }

  function renderComment(comment) {
    const box = document.createElement('div');
    box.className = 'comment';

    const meta = document.createElement('p');
    meta.className = 'comment-meta';

    const authorLink = document.createElement('a');
    authorLink.href = 'author.html?id=' + comment.author_id;
    authorLink.textContent = comment.profiles ? comment.profiles.nickname : 'Unknown';

    meta.append(authorLink, ' · ' + new Date(comment.created_at).toLocaleString('ko-KR'));

    const body = document.createElement('p');
    body.className = 'post-content';
    body.textContent = comment.content;

    box.append(meta, body);

    if (me && (me === comment.author_id || me === post.author_id)) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'link-danger';
      del.textContent = 'Delete';

      del.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        del.disabled = true;

        const { data: deleted, error: deleteError } = await db
          .from('comments')
          .delete()
          .eq('id', comment.id)
          .select('id');

        if (deleteError || !deleted || deleted.length === 0) {
          alert('Failed to delete the comment.');
          del.disabled = false;
          return;
        }

        loadComments();
      });

      box.append(del);
    }

    return box;
  }

  if (me) {
    const form = document.createElement('form');
    form.className = 'write-form comment-form';

    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.maxLength = 1000;
    textarea.placeholder = 'Write a comment';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Post comment';

    const message = document.createElement('p');
    message.className = 'form-message';

    button.addEventListener('click', async () => {
      const content = textarea.value.trim();

      if (!content) {
        message.textContent = 'Please write something.';
        return;
      }

      button.disabled = true;
      message.textContent = '';

      const { error } = await db
        .from('comments')
        .insert({ post_id: postId, content });

      button.disabled = false;

      if (error) {
        message.textContent = 'Failed to post: ' + error.message;
        return;
      }

      textarea.value = '';
      loadComments();
    });

    form.append(textarea, button, message);
    section.append(form);
  } else {
    const note = document.createElement('p');
    note.className = 'state-message';

    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.textContent = 'Log in';

    note.append(loginLink, ' to leave a comment.');
    section.append(note);
  }

  await loadComments();
})();