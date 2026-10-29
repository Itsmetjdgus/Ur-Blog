async function loadPosts() {
  const list = document.getElementById('post-list');

  const { data, error } = await db
    .from('posts')
    .select('id, title, content, author_id, created_at, profiles(nickname)')
    .order('created_at', { ascending: false });

  if (error) {
    list.textContent = 'Failed to load posts.';
    console.error(error);
    return;
  }

  list.innerHTML = '';

  if (data.length === 0) {
    list.textContent = 'No posts yet.';
    return;
  }

  data.forEach((post) => list.append(renderPostCard(post, true)));
}

loadPosts();