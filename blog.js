const PAGE_SIZE = 10;

async function loadPosts() {
  const list = document.getElementById('post-list');
  const pager = document.getElementById('pager');
  const params = new URLSearchParams(window.location.search);

  const rawQuery = (params.get('q') || '').slice(0, 50);
  const keyword = rawQuery.replace(/[%_,()*\\]/g, ' ').trim();
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = rawQuery;

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db
    .from('posts')
    .select('id, title, content, author_id, created_at, image_path, profiles(nickname)', { count: 'exact' });

  if (keyword) {
    query = query.or('title.ilike.%' + keyword + '%,content.ilike.%' + keyword + '%');
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  list.innerHTML = '';
  pager.innerHTML = '';

  if (error) {
    console.error(error);
    list.textContent = page > 1 ? 'No posts on this page.' : 'Failed to load posts.';
    return;
  }

  if (data.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'state-message';
    empty.textContent = keyword ? 'No posts match your search.' : 'No posts yet.';
    list.append(empty);
    return;
  }

  data.forEach((post) => list.append(renderPostCard(post, true)));

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  function pageUrl(p) {
    const next = new URLSearchParams();
    if (rawQuery) next.set('q', rawQuery);
    next.set('page', p);
    return 'blog.html?' + next.toString();
  }

  const prev = document.createElement('a');
  prev.textContent = '← Prev';
  if (page > 1) prev.href = pageUrl(page - 1);
  else prev.className = 'disabled';

  const info = document.createElement('span');
  info.textContent = 'Page ' + page + ' of ' + totalPages;

  const next = document.createElement('a');
  next.textContent = 'Next →';
  if (page < totalPages) next.href = pageUrl(page + 1);
  else next.className = 'disabled';

  pager.append(prev, info, next);
}

loadPosts();