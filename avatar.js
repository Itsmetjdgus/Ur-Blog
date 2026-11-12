// 프로필 사진 공통 도구: 사진이 있으면 이미지, 없으면(또는 불러오기 실패하면) 닉네임 첫 글자
function getAvatarUrl(path) {
  return db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

function createAvatar(nickname, avatarPath, small) {
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
  });
  box.append(img);
  return box;
}