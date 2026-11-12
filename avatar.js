// 프로필 사진 공통 도구
function getAvatarUrl(path) {
  return db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

// 사진을 크게 보여 주는 화면: 바깥 클릭, × 버튼, Esc로 닫는다
function openAvatarZoom(path) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const img = document.createElement('img');
  img.src = getAvatarUrl(path);
  img.alt = '';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lightbox-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('common.close'));

  function closeZoom() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
  function onKey(e) {
    if (e.key === 'Escape') closeZoom();
  }

  overlay.addEventListener('click', closeZoom);
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';

  overlay.append(img, closeBtn);
  document.body.append(overlay);
  closeBtn.focus();
}

function createAvatar(nickname, avatarPath, small, zoomable) {
  const box = document.createElement('div');
  box.className = small ? 'avatar-sm' : 'avatar';
  const initial = (nickname || '?').charAt(0).toUpperCase();

  if (!avatarPath) {
    box.textContent = initial;
    return box;
  }

  const img = document.createElement('img');
  img.src = getAvatarUrl(avatarPath);
  img.alt = '';
  img.addEventListener('error', function () {
    img.remove();
    box.textContent = initial;
    box.onclick = null;
    box.onkeydown = null;
    box.classList.remove('zoomable');
    box.removeAttribute('role');
    box.removeAttribute('tabindex');
    box.removeAttribute('aria-label');
  });
  box.append(img);

  if (zoomable) {
    box.classList.add('zoomable');
    box.setAttribute('role', 'button');
    box.tabIndex = 0;
    box.setAttribute('aria-label', t('profile.photo_zoom'));
    box.onclick = function () {
      openAvatarZoom(avatarPath);
    };
    box.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAvatarZoom(avatarPath);
      }
    };
  }

  return box;
}