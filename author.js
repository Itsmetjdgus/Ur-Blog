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