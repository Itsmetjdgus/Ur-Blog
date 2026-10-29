(async function () {
  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const button = document.getElementById('publish-btn');
  const message = document.getElementById('write-message');
  const heading = document.getElementById('write-heading');

  const editId = Number(new URLSearchParams(window.location.search).get('id')) || null;

  if (editId) {
    heading.textContent = 'Edit Post';
    button.textContent = 'Save changes';

    const { data: post, error } = await db
      .from('posts')
      .select('id, title, content, author_id')
      .eq('id', editId)
      .maybeSingle();

    if (error || !post || post.author_id !== session.user.id) {
      message.textContent = 'You cannot edit this post.';
      button.disabled = true;
      return;
    }

    titleInput.value = post.title;
    contentInput.value = post.content;
  }

  button.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
      message.textContent = 'Please enter both title and content.';
      return;
    }

    button.disabled = true;
    message.textContent = 'Saving...';

    let result;
    if (editId) {
      result = await db
        .from('posts')
        .update({ title, content })
        .eq('id', editId)
        .select('id')
        .maybeSingle();
    } else {
      result = await db
        .from('posts')
        .insert({ title, content })
        .select('id')
        .single();
    }

    const { data: saved, error } = result;

    if (error || !saved) {
      message.textContent = 'Failed to save.' + (error ? ' ' + error.message : '');
      button.disabled = false;
      return;
    }

    window.location.href = 'post.html?id=' + saved.id;
  });
})();