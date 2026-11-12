// 프로필 머리말: 사진, 닉네임, 소개글 / 내 프로필이면 수정 / 남의 프로필이면 신고
(async function () {
  const box = document.getElementById('profile-header');
  if (!box) return;

  const profileId = new URLSearchParams(location.search).get('id');
  if (!profileId) return;

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, nickname, bio, avatar_path')
    .eq('id', profileId)
    .maybeSingle();

  if (error || !profile) return; // 못 찾으면 author.js가 안내 문구를 처리한다

  const { data: userData } = await db.auth.getUser();
  const me = userData && userData.user ? userData.user.id : null;
  const isMine = me === profile.id;

    // 팔로워 수(누구나 볼 수 있음). 팔로잉 수는 본인에게만 오고 타인에게는 null.
  // 내 프로필이면 받은 요청 수도 읽는다.
  let counts = { followers: 0, following: null };
  const { data: countData } = await db.rpc('get_follow_counts', { uid: profile.id });
  if (countData && countData[0]) {
    counts = {
      followers: Number(countData[0].followers),
      following: countData[0].following === null ? null : Number(countData[0].following),
    };
  }

  let pendingCount = 0;
  if (isMine) {
    const { count } = await db
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', me)
      .eq('status', 'pending');
    pendingCount = count || 0;
  }

  function makeStat(key, value, href) {
    const el = document.createElement(href ? 'a' : 'span');
    if (href) el.href = href;
    el.textContent = t(key, { n: value });
    return el;
  }

  const MAX_INPUT_SIZE = 15 * 1024 * 1024;
  const TYPES = { 'image/jpeg': true, 'image/png': true, 'image/webp': true };

  function render() {
    box.textContent = '';

        const avatar = createAvatar(profile.nickname, profile.avatar_path, false, true);

    const info = document.createElement('div');
    info.className = 'profile-info';

    const name = document.createElement('h2');
    name.className = 'profile-name';
    name.textContent = profile.nickname;

    const bio = document.createElement('p');
    bio.className = 'profile-bio';
    bio.textContent = profile.bio ? profile.bio : t('profile.no_bio');

    info.appendChild(name);
    info.appendChild(bio);

        const stats = document.createElement('div');
    stats.className = 'profile-stats';
    stats.append(
      makeStat('profile.followers', counts.followers, isMine ? 'connections.html?tab=followers' : null)
    );
    if (isMine) {
      stats.append(makeStat('profile.following', counts.following || 0, 'connections.html?tab=following'));
    }
    if (isMine && pendingCount > 0) {
      stats.append(makeStat('profile.requests', pendingCount, 'connections.html?tab=requests'));
    }
    info.appendChild(stats);

    if (isMine) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = t('profile.edit');
      editBtn.addEventListener('click', renderEdit);
      info.appendChild(editBtn);
    } else if (me) {
      info.appendChild(createReportControl('profile', profile.id));
    }

    box.appendChild(avatar);
    box.appendChild(info);
  }

  function renderEdit() {
    box.textContent = '';

    let newFile = null;
    let removePhoto = false;
    const initial = (profile.nickname || '?').charAt(0).toUpperCase();

    const form = document.createElement('div');
    form.className = 'profile-edit';

    // --- 사진 ---
    const photoLabel = document.createElement('label');
    photoLabel.textContent = t('profile.photo_label');
    photoLabel.setAttribute('for', 'avatar-input');

    const preview = createAvatar(profile.nickname, profile.avatar_path, false);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'avatar-input';
    fileInput.accept = 'image/jpeg,image/png,image/webp';

    const msg = document.createElement('p');
    msg.className = 'state-message';

    fileInput.addEventListener('change', function () {
      msg.textContent = '';
      const f = fileInput.files[0];
      if (!f) return;
      if (!TYPES[f.type]) {
        msg.textContent = t('profile.photo_type');
        fileInput.value = '';
        return;
      }
      if (f.size > MAX_INPUT_SIZE) {
        msg.textContent = t('profile.photo_size');
        fileInput.value = '';
        return;
      }
      newFile = f;
      removePhoto = false;
      preview.textContent = '';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = '';
      preview.appendChild(img);
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = t('profile.photo_remove');
    removeBtn.hidden = !profile.avatar_path;
    removeBtn.addEventListener('click', function () {
      removePhoto = true;
      newFile = null;
      fileInput.value = '';
      preview.textContent = initial;
    });

    // --- 소개글 ---
    const bioLabel = document.createElement('label');
    bioLabel.textContent = t('profile.bio_label');
    bioLabel.setAttribute('for', 'bio-input');

    const input = document.createElement('textarea');
    input.id = 'bio-input';
    input.maxLength = 100;
    input.rows = 3;
    input.value = profile.bio || '';

    const counter = document.createElement('p');
    counter.className = 'state-message';
    function updateCounter() {
      counter.textContent = t('profile.counter', { n: input.value.length });
    }
    updateCounter();
    input.addEventListener('input', updateCounter);

    const help = document.createElement('p');
    help.className = 'state-message';
    help.textContent = t('profile.bio_help');

    // --- 저장 / 취소 ---
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = t('profile.save');
    save.addEventListener('click', async function () {
      save.disabled = true;
      msg.textContent = t('profile.saving');

      const fields = { bio: input.value.trim() };
      const oldPath = profile.avatar_path;
      let uploadedPath = null;

      if (newFile) {
        let blob = null;
        try {
             blob = await resizeSquare(newFile, 512, 0.85);
        } catch (e) {
          blob = null;
        }
        if (!blob) {
          msg.textContent = t('profile.photo_failed');
          save.disabled = false;
          return;
        }

        uploadedPath = me + '/' + Date.now() + '.jpg';
        const { error: upErr } = await db.storage
          .from('avatars')
          .upload(uploadedPath, blob, { contentType: 'image/jpeg' });
        if (upErr) {
          msg.textContent = t('profile.photo_failed');
          save.disabled = false;
          return;
        }
        fields.avatar_path = uploadedPath;
      } else if (removePhoto) {
        fields.avatar_path = null;
      }

      const { data: updated, error: updateErr } = await db
        .from('profiles')
        .update(fields)
        .eq('id', profile.id)
        .select('bio, avatar_path')
        .maybeSingle();

      if (updateErr || !updated) {
        if (uploadedPath) {
          await db.storage.from('avatars').remove([uploadedPath]);
        }
        msg.textContent = t('profile.save_failed');
        save.disabled = false;
        return;
      }

      if (oldPath && oldPath !== updated.avatar_path) {
        await db.storage.from('avatars').remove([oldPath]);
      }

      profile.bio = updated.bio;
      profile.avatar_path = updated.avatar_path;
      render();
    });

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = t('profile.cancel');
    cancel.addEventListener('click', render);

    form.append(
      photoLabel, preview, fileInput, removeBtn,
      bioLabel, input, counter, help, msg,
      save, cancel
    );
    box.appendChild(form);
  }

  document.addEventListener('nickname-changed', function (e) {
    profile.nickname = e.detail;
    render();
  });

  render();
})();