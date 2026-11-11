// 프로필 머리말: 아바타, 닉네임, 소개글, 내 프로필이면 수정 버튼
(async function () {
  const box = document.getElementById('profile-header');
  if (!box) return;

  const profileId = new URLSearchParams(location.search).get('id');
  if (!profileId) return;

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, nickname, bio')
    .eq('id', profileId)
    .maybeSingle();

  if (error || !profile) return; // 못 찾으면 author.js가 안내 문구를 처리한다

  const { data: userData } = await db.auth.getUser();
  const isMine = !!(userData && userData.user && userData.user.id === profile.id);

  function render() {
    box.textContent = '';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = (profile.nickname || '?').charAt(0).toUpperCase();

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

    if (isMine) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = t('profile.edit');
      editBtn.addEventListener('click', renderEdit);
      info.appendChild(editBtn);
    }

    // follow.js가 쓰는 영역이 따로 있다면 이 아래에 그대로 둔다
    box.appendChild(avatar);
    box.appendChild(info);
  }

  function renderEdit() {
    box.textContent = '';

    const label = document.createElement('label');
    label.textContent = t('profile.bio_label');
    label.setAttribute('for', 'bio-input');

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

    const msg = document.createElement('p');
    msg.className = 'state-message';

    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = t('profile.save');
    save.addEventListener('click', async function () {
      save.disabled = true;
      const newBio = input.value.trim();
      const { error: upErr } = await db
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', profile.id);
      if (upErr) {
        msg.textContent = t('profile.save_failed');
        save.disabled = false;
        return;
      }
      profile.bio = newBio;
      render();
    });

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = t('profile.cancel');
    cancel.addEventListener('click', render);

    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(counter);
    box.appendChild(help);
    box.appendChild(msg);
    box.appendChild(save);
    box.appendChild(cancel);
  }

    document.addEventListener('nickname-changed', function (e) {
    profile.nickname = e.detail;
    render();
  });

  render();

  render();
})();