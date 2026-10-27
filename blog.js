async function loadPosts() {
  const list = document.getElementById('post-list');

  const { data, error } = await db
    .from('posts')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    list.textContent = 'Failed to load posts.';
    console.error(error);
    return;
  }

  list.innerHTML = '';

  data.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'post';

    const link = document.createElement('a');
    link.className = 'post-link';
    link.href = 'post.html?id=' + post.id;

    const h2 = document.createElement('h2');
    h2.textContent = post.title;

    const date = document.createElement('p');
    date.className = 'date';
    date.textContent = new Date(post.created_at).toLocaleDateString('ko-KR');

    const preview = document.createElement('p');
    preview.textContent = post.content.slice(0, 100);

    link.append(h2, date, preview);
    article.append(link);
    list.append(article);
  });
}

loadPosts();