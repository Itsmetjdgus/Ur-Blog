function getImageUrl(path) {
  return db.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}

function renderPostCard(post, showAuthor) {
  const article = document.createElement('article');
  article.className = 'post';

  const link = document.createElement('a');
  link.className = 'post-link';
  link.href = 'post.html?id=' + post.id;

  const h2 = document.createElement('h2');
  h2.textContent = post.title;

  const date = document.createElement('p');
  date.className = 'date';
  let dateText = new Date(post.created_at).toLocaleDateString('ko-KR');
  if (showAuthor) {
    const name = post.profiles && post.profiles.nickname ? post.profiles.nickname : 'Anonymous';
    dateText += ' · by ' + name;
  }
  date.textContent = dateText;

  const preview = document.createElement('p');
  preview.textContent = post.content.slice(0, 100);

  if (post.image_path) {
    const img = document.createElement('img');
    img.src = getImageUrl(post.image_path);
    img.alt = post.title;
    img.className = 'post-thumb';
    img.loading = 'lazy';
    link.append(img);
  }
  link.append(h2, date, preview);
  article.append(link);
  return article;
}