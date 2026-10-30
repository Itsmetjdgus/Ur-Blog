(async function () {
  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const imageInput = document.getElementById('image');
  const button = document.getElementById('publish-btn');
  const message = document.getElementById('write-message');
  const heading = document.getElementById('write-heading');

  const MAX_INPUT_SIZE = 15 * 1024 * 1024;
  const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  const editId = Number(new URLSearchParams(window.location.search).get('id')) || null;
  let oldImagePath = null;

  if (editId) {
    heading.textContent = 'Edit Post';
    button.textContent = 'Save changes';

    const { data: post, error } = await db
      .from('posts')
      .select('id, title, content, author_id, image_path')
      .eq('id', editId)
      .maybeSingle();

    if (error || !post || post.author_id !== session.user.id) {
      message.textContent = 'You cannot edit this post.';
      button.disabled = true;
      return;
    }

    titleInput.value = post.title;
    contentInput.value = post.content;
    oldImagePath = post.image_path;
  }

  button.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
      message.textContent = 'Please enter both title and content.';
      return;
    }

    const file = imageInput.files[0];
    if (file) {
      if (!TYPES[file.type]) {
        message.textContent = 'Only JPG, PNG, and WEBP images are allowed.';
        return;
      }
      if (file.size > MAX_INPUT_SIZE) {
        message.textContent = 'Image must be 15MB or smaller.';
        return;
      }
    }

    button.disabled = true;
    message.textContent = 'Saving...';

     let newImagePath = null;
    if (file) {
      message.textContent = 'Processing image...';

      let resized;
      try {
        resized = await resizeImage(file, 1600, 0.85);
      } catch (e) {
        resized = null;
      }

      if (!resized) {
        message.textContent = 'Could not process this image. Try another one.';
        button.disabled = false;
        return;
      }

      newImagePath =
        session.user.id + '/' + Date.now() + '-' +
        Math.random().toString(36).slice(2, 8) + '.jpg';

      const { error: uploadError } = await db.storage
        .from('post-images')
        .upload(newImagePath, resized, { contentType: 'image/jpeg' });

      if (uploadError) {
        message.textContent = 'Image upload failed: ' + uploadError.message;
        button.disabled = false;
        return;
      }
    }

    const fields = { title, content };
    if (newImagePath) fields.image_path = newImagePath;

    let result;
    if (editId) {
      result = await db
        .from('posts')
        .update(fields)
        .eq('id', editId)
        .select('id')
        .maybeSingle();
    } else {
      result = await db
        .from('posts')
        .insert(fields)
        .select('id')
        .single();
    }

    const { data: saved, error } = result;

    if (error || !saved) {
      if (newImagePath) {
        await db.storage.from('post-images').remove([newImagePath]);
      }
      message.textContent = 'Failed to save.' + (error ? ' ' + error.message : '');
      button.disabled = false;
      return;
    }

    if (editId && newImagePath && oldImagePath) {
      await db.storage.from('post-images').remove([oldImagePath]);
    }

    window.location.href = 'post.html?id=' + saved.id;
  });
})();