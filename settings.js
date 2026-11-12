(async function () {
  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const errorBox = document.getElementById('settings-error');

  // ----- 메뉴(탭) -----
  const TABS = ['account', 'privacy', 'security', 'about'];
  let tab = new URLSearchParams(window.location.search).get('tab');
  if (TABS.indexOf(tab) === -1) tab = 'account';

  document.querySelectorAll('.settings-menu a').forEach(function (a) {
    if (a.dataset.tab === tab) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
  TABS.forEach(function (name) {
    document.getElementById('tab-' + name).hidden = name !== tab;
  });

  // ----- 내 프로필 읽기 -----
  const { data: profile, error } = await db
    .from('profiles')
    .select('id, nickname, is_private')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !profile) {
    errorBox.textContent = t('settings.load_failed');
    return;
  }

  // ----- 계정: 닉네임 -----
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname');
  const nicknameBtn = document.getElementById('nickname-btn');
  const nicknameMessage = document.getElementById('nickname-message');

  nicknameInput.value = profile.nickname;

  nicknameForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    nicknameMessage.className = 'form-message';

    const nickname = nicknameInput.value.trim();

    if (nickname.length < 2 || nickname.length > 20) {
      nicknameMessage.textContent = t('settings.nickname_length');
      return;
    }
    if (nickname.indexOf('@') !== -1) {
      nicknameMessage.textContent = t('settings.nickname_at');
      return;
    }

    nicknameBtn.disabled = true;

    const { data: updated, error: updateError } = await db
      .from('profiles')
      .update({ nickname: nickname })
      .eq('id', profile.id)
      .select('nickname')
      .maybeSingle();

    nicknameBtn.disabled = false;

    if (updateError || !updated) {
      if (updateError && updateError.code === '23505') {
        nicknameMessage.textContent = t('settings.nickname_taken');
      } else {
        nicknameMessage.textContent = t('settings.nickname_failed');
      }
      return;
    }

    nicknameInput.value = updated.nickname;
    nicknameMessage.className = 'form-message ok';
    nicknameMessage.textContent = t('settings.saved');
  });

  // ----- 개인정보 보호: 공개 / 비공개 -----
  const privacyStatus = document.getElementById('privacy-status');
  const privacySave = document.getElementById('privacy-save');
  const privacyMessage = document.getElementById('privacy-message');
  const radios = document.querySelectorAll('input[name="privacy"]');

  let current = profile.is_private ? 'private' : 'public';

  function showCurrent() {
    privacyStatus.textContent = t('settings.privacy_current', {
      state: t(current === 'private' ? 'settings.state_private' : 'settings.state_public'),
    });
    radios.forEach(function (radio) {
      radio.checked = radio.value === current;
    });
  }

  showCurrent();

  privacySave.addEventListener('click', async function () {
    privacyMessage.className = 'form-message';

    const selected = document.querySelector('input[name="privacy"]:checked');
    if (!selected) {
      privacyMessage.textContent = t('settings.choose');
      return;
    }
    if (selected.value === current) {
      privacyMessage.textContent = t('settings.no_change');
      return;
    }

    const goingPublic = selected.value === 'public';
    if (!confirm(t(goingPublic ? 'settings.confirm_public' : 'settings.confirm_private'))) return;

    privacySave.disabled = true;

    const { data, error: updateError } = await db
      .from('profiles')
      .update({ is_private: !goingPublic })
      .eq('id', session.user.id)
      .select('is_private')
      .maybeSingle();

    privacySave.disabled = false;

    if (updateError || !data) {
      privacyMessage.textContent = t('settings.save_failed');
      return;
    }

    current = data.is_private ? 'private' : 'public';
    showCurrent();
    privacyMessage.className = 'form-message ok';
    privacyMessage.textContent = t('settings.saved');
  });

  // ----- 보안: 계정 삭제 (비밀번호 재확인) -----
  const deleteForm = document.getElementById('delete-form');
  const deletePassword = document.getElementById('delete-password');
  const deleteConfirm = document.getElementById('delete-confirm');
  const deleteBtn = document.getElementById('delete-account-btn');
  const deleteMessage = document.getElementById('delete-message');

  deleteForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    deleteMessage.className = 'form-message';

    if (!deletePassword.value) {
      deleteMessage.textContent = t('settings.delete_need_pw');
      return;
    }
    if (deleteConfirm.value !== 'DELETE') {
      deleteMessage.textContent = t('settings.delete_need_word');
      return;
    }
    if (!confirm(t('settings.delete_confirm'))) return;

    deleteBtn.disabled = true;
    deleteMessage.textContent = t('settings.deleting');

    // 1) 비밀번호 재확인
    const { error: passwordError } = await db.auth.signInWithPassword({
      email: session.user.email,
      password: deletePassword.value,
    });
    if (passwordError) {
      deleteMessage.textContent = t('settings.delete_bad_pw');
      deleteBtn.disabled = false;
      return;
    }

    const userId = session.user.id;

    // 2) 글 이미지 삭제
    const { data: myPosts, error: postsError } = await db
      .from('posts')
      .select('image_path')
      .eq('author_id', userId)
      .not('image_path', 'is', null);

    if (postsError) {
      deleteMessage.textContent = t('settings.delete_failed');
      deleteBtn.disabled = false;
      return;
    }

    const paths = myPosts.map(function (p) { return p.image_path; });
    if (paths.length > 0) {
      const { error: removeError } = await db.storage.from('post-images').remove(paths);
      if (removeError) {
        deleteMessage.textContent = t('settings.delete_images_failed');
        deleteBtn.disabled = false;
        return;
      }
    }

    // 3) 프로필 사진 삭제
    const { data: avatarFiles } = await db.storage.from('avatars').list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const { error: avatarRemoveError } = await db.storage
        .from('avatars')
        .remove(avatarFiles.map(function (f) { return userId + '/' + f.name; }));
      if (avatarRemoveError) {
        deleteMessage.textContent = t('settings.delete_images_failed');
        deleteBtn.disabled = false;
        return;
      }
    }

    // 4) 계정 삭제
    const { error: rpcError } = await db.rpc('delete_my_account');
    if (rpcError) {
      deleteMessage.textContent = t('settings.delete_failed');
      deleteBtn.disabled = false;
      return;
    }

    try {
      await db.auth.signOut();
    } catch (e) {}

    window.location.href = 'index.html';
  });
})();