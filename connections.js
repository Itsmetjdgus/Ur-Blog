// 연결 화면: 받은 요청(수락/거절), 내 팔로워(삭제), 내 팔로잉(취소). 본인 것만 볼 수 있다.
(async function () {
  const list = document.getElementById('conn-list');
  const message = document.getElementById('conn-message');
  const tabLinks = document.querySelectorAll('.tabs a');

  const { data: sessionData } = await db.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  const me = session.user.id;

  const VALID = ['requests', 'followers', 'following'];
  let tab = new URLSearchParams(location.search).get('tab');
  if (VALID.indexOf(tab) === -1) tab = 'followers';

  tabLinks.forEach(function (a) {
    if (a.dataset.tab === tab) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  function note(text) {
    const p = document.createElement('p');
    p.className = 'state-message';
    p.textContent = text;
    list.append(p);
  }

  function showEmptyIfNeeded() {
    if (!list.querySelector('.person-row')) {
      list.textContent = '';
      note(t('conn.empty_' + tab));
    }
  }

  // 1) 내가 당사자인 팔로우 행 읽기
  let query = db.from('follows').select('follower_id, following_id, status, created_at');
  if (tab === 'requests') {
    query = query.eq('following_id', me).eq('status', 'pending');
  } else if (tab === 'followers') {
    query = query.eq('following_id', me).eq('status', 'accepted');
  } else {
    query = query.eq('follower_id', me);
  }

  const { data: rows, error } = await query
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    note(t('conn.load_failed'));
    return;
  }
  if (!rows || rows.length === 0) {
    note(t('conn.empty_' + tab));
    return;
  }

  // 2) 상대방 프로필 읽기
  function otherId(row) {
    return tab === 'following' ? row.following_id : row.follower_id;
  }
  const ids = rows.map(otherId);

  const { data: people, error: peopleError } = await db
    .from('profiles')
    .select('id, nickname, bio, avatar_path')
    .in('id', ids);

  if (peopleError || !people) {
    note(t('conn.load_failed'));
    return;
  }
  const byId = {};
  people.forEach(function (p) { byId[p.id] = p; });

  // 3) 행 만들기
  function makeButton(label, secondary, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = secondary ? 'follow-btn secondary' : 'follow-btn';
    btn.textContent = label;
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      message.textContent = '';
      const ok = await handler();
      if (!ok) message.textContent = t('conn.error');
      if (!ok || btn.isConnected) btn.disabled = false;
    });
    return btn;
  }

  async function acceptRequest(person) {
    const { data, error: e } = await db
      .from('follows')
      .update({ status: 'accepted' })
      .eq('follower_id', person.id)
      .eq('following_id', me)
      .select('follower_id');
    return !e && data && data.length > 0;
  }

  async function removeFollowRow(followerId, followingId) {
    const { data, error: e } = await db
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .select('follower_id');
    return !e && data && data.length > 0;
  }

  function buildRow(row, person) {
    const wrap = document.createElement('div');
    wrap.className = 'person-row';

    const card = document.createElement('a');
    card.className = 'person-card';
    card.href = 'author.html?id=' + encodeURIComponent(person.id);

    const avatar = createAvatar(person.nickname, person.avatar_path, true);
    const info = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'person-name';
    name.textContent = person.nickname;
    info.append(name);
    if (person.bio) {
      const bio = document.createElement('p');
      bio.className = 'person-bio';
      bio.textContent = person.bio;
      info.append(bio);
    }
    card.append(avatar, info);

    const actions = document.createElement('div');
    actions.className = 'person-actions';

    function done() {
      wrap.remove();
      showEmptyIfNeeded();
    }

    if (tab === 'requests') {
      actions.append(
        makeButton(t('conn.accept'), false, async function () {
          const ok = await acceptRequest(person);
          if (ok) done();
          return ok;
        }),
        makeButton(t('conn.decline'), true, async function () {
          const ok = await removeFollowRow(person.id, me);
          if (ok) done();
          return ok;
        })
      );
    } else if (tab === 'followers') {
      actions.append(
        makeButton(t('conn.remove'), true, async function () {
          if (!confirm(t('conn.confirm_remove', { name: person.nickname }))) return true;
          const ok = await removeFollowRow(person.id, me);
          if (ok) done();
          return ok;
        })
      );
    } else {
      const isPending = row.status === 'pending';
      if (isPending) {
        const badge = document.createElement('span');
        badge.className = 'follow-note';
        badge.textContent = t('conn.requested');
        actions.append(badge);
      }
      actions.append(
        makeButton(
          isPending ? t('conn.cancel_request') : t('conn.unfollow'),
          true,
          async function () {
            const text = isPending ? 'conn.confirm_cancel' : 'conn.confirm_unfollow';
            if (!confirm(t(text, { name: person.nickname }))) return true;
            const ok = await removeFollowRow(me, person.id);
            if (ok) done();
            return ok;
          }
        )
      );
    }

    wrap.append(card, actions);
    return wrap;
  }

  list.textContent = '';
  rows.forEach(function (row) {
    const person = byId[otherId(row)];
    if (person) list.append(buildRow(row, person));
  });
  showEmptyIfNeeded();
})();