(async function () {
  const box = document.getElementById('post-detail');
  const id = Number(new URLSearchParams(window.location.search).get('id'));

  if (!id) {
    box.textContent = 'Post not found.';
    return;
  }

  const { data: post, error } = await db
    .from('posts')
    .select('id, title, content, author_id, created_at, profiles(nickname)')
    .eq('id', id)
    .maybeSingle();

  if (error || !post) {
    box.textContent = 'Post not found.';
    return;
  }

  document.title = post.title;

  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;
  const isOwner = !!session && session.user.id === post.author_id;

  const article = document.createElement('article');
  article.className = 'post';

  const h2 = document.createElement('h2');
  h2.textContent = post.title;

  const date = document.createElement('p');
  date.className = 'date';
  date.textContent = new Date(post.created_at).toLocaleDateString('ko-KR');

    const author = document.createElement('p');
  author.className = 'date';
  author.append('by ');
  if (post.author_id && post.profiles) {
    const authorLink = document.createElement('a');
    authorLink.href = 'author.html?id=' + post.author_id;
    authorLink.textContent = post.profiles.nickname;
    author.append(authorLink);
  } else {
    author.append('Anonymous');
  }

  const body = document.createElement('p');
  body.className = 'post-content';
  body.textContent = post.content;

  article.append(h2, date, author, body);

  if (isOwner) {
    const actions = document.createElement('div');
    actions.className = 'post-actions';

    const editLink = document.createElement('a');
    editLink.href = 'write.html?id=' + post.id;
    editLink.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'danger';
    deleteBtn.textContent = 'Delete';

    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this post? This cannot be undone.')) return;
      deleteBtn.disabled = true;

      const { data: deleted, error: deleteError } = await db
        .from('posts')
        .delete()
        .eq('id', post.id)
        .select('id');

      if (deleteError || !deleted || deleted.length === 0) {
        alert('Failed to delete the post.');
        deleteBtn.disabled = false;
        return;
      }

      window.location.href = 'blog.html';
    });

    actions.append(editLink, deleteBtn);
    article.append(actions);
  }

  const back = document.createElement('a');
  back.href = 'blog.html';
  back.textContent = 'Back to list';
  article.append(back);

  box.innerHTML = '';
  box.append(article);
})();