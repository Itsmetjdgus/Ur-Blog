// 닉네임 검색: 부분 일치, 대소문자 무시, 정확히 일치하는 사람을 맨 위로
(async function () {
  const list = document.getElementById('people-list');
  const input = document.getElementById('people-input');
  const MAX_SHOWN = 20;

  const rawQuery = (new URLSearchParams(location.search).get('q') || '').slice(0, 20);
  // blog.js와 같은 방식으로 특수문자를 제거한다(% _ 등은 검색 패턴을 깨뜨림)
  const keyword = rawQuery.replace(/[%_,()*\\]/g, ' ').trim();

  input.value = rawQuery;
  input.placeholder = t('people.placeholder');
  list.textContent = '';

  function note(text) {
    const p = document.createElement('p');
    p.className = 'state-message';
    p.textContent = text;
    list.append(p);
  }

  if (!rawQuery.trim()) {
    note(t('people.prompt'));
    return;
  }
  if (keyword.length < 2) {
    note(t('people.too_short'));
    return;
  }

  const { data: sessionData } = await db.auth.getSession();
  const myId = sessionData.session ? sessionData.session.user.id : null;

  const { data, error } = await db
    .from('profiles')
        .select('id, nickname, bio, avatar_path')
    .ilike('nickname', '%' + keyword + '%')
    .limit(50);

  if (error) {
    note(t('people.error'));
    return;
  }
  if (!data || data.length === 0) {
    note(t('people.none'));
    return;
  }

  const lower = keyword.toLowerCase();
  function rank(nickname) {
    const n = nickname.toLowerCase();
    if (n === lower) return 0;
    if (n.startsWith(lower)) return 1;
    return 2;
  }
  data.sort(function (a, b) {
    return rank(a.nickname) - rank(b.nickname) || a.nickname.localeCompare(b.nickname);
  });

  data.slice(0, MAX_SHOWN).forEach(function (person) {
    const card = document.createElement('a');
    card.className = 'person-card';
    card.href = 'author.html?id=' + encodeURIComponent(person.id);

       const avatar = createAvatar(person.nickname, person.avatar_path, true);

    const info = document.createElement('div');

    const name = document.createElement('p');
    name.className = 'person-name';
    name.textContent = person.nickname + (person.id === myId ? ' (' + t('people.you') + ')' : '');
    info.append(name);

    if (person.bio) {
      const bio = document.createElement('p');
      bio.className = 'person-bio';
      bio.textContent = person.bio;
      info.append(bio);
    }

    card.append(avatar, info);
    list.append(card);
  });

  if (data.length > MAX_SHOWN) note(t('people.more_hint'));
})();