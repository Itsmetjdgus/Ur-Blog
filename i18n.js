// Tidnote 번역 도우미. 새 문구는 반드시 여기에 ko/en 둘 다 추가한다.
const I18N = {
  ko: {
    'profile.posts_of': '{name}님의 글',
    'profile.no_bio': '아직 소개글이 없습니다.',
    'profile.edit': '프로필 수정',
    'profile.bio_label': '한 줄 소개',
    'profile.bio_help': '소개글은 비공개 계정이어도 모든 사람에게 보입니다. 개인정보나 연락처는 쓰지 마세요.',
    'profile.save': '저장',
    'profile.cancel': '취소',
    'profile.saved': '저장했습니다.',
    'profile.save_failed': '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    'profile.not_found': '사용자를 찾을 수 없습니다.',
    'profile.counter': '{n}/100',
        'people.title': '사람 찾기',
    'people.placeholder': '닉네임 검색',
    'people.search': '검색',
    'people.prompt': '찾고 싶은 사람의 닉네임을 입력하세요.',
    'people.too_short': '두 글자 이상 입력해 주세요.',
    'people.none': '검색 결과가 없습니다.',
    'people.error': '검색하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    'people.you': '나',
    'people.more_hint': '결과가 많아 일부만 보여 드립니다. 닉네임을 더 자세히 입력해 보세요.'
  },
  en: {
    'profile.posts_of': "{name}'s posts",
    'profile.no_bio': 'No bio yet.',
    'profile.edit': 'Edit profile',
    'profile.bio_label': 'Bio',
    'profile.bio_help': 'Your bio is visible to everyone, even if your account is private. Do not include personal details or contact info.',
    'profile.save': 'Save',
    'profile.cancel': 'Cancel',
    'profile.saved': 'Saved.',
    'profile.save_failed': 'Could not save. Please try again in a moment.',
    'profile.not_found': 'User not found.',
    'profile.counter': '{n}/100',
        'people.title': 'Find people',
    'people.placeholder': 'Search by nickname',
    'people.search': 'Search',
    'people.prompt': 'Enter a nickname to find someone.',
    'people.too_short': 'Please enter at least 2 characters.',
    'people.none': 'No users found.',
    'people.error': 'Could not search. Please try again in a moment.',
    'people.you': 'You',
    'people.more_hint': 'Showing only some of the results. Try a more specific nickname.'
  }
};

function getLang() {
  try {
    const saved = localStorage.getItem('tidnote_lang');
    if (saved === 'ko' || saved === 'en') return saved;
  } catch (e) {}
  return (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function setLang(lang) {
  if (lang !== 'ko' && lang !== 'en') return;
  try { localStorage.setItem('tidnote_lang', lang); } catch (e) {}
  document.documentElement.lang = lang;
}

function t(key, vars) {
  const lang = getLang();
  let text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) {
    for (const k in vars) text = text.split('{' + k + '}').join(String(vars[k]));
  }
  return text;
}

function applyI18n() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = t(el.dataset.i18n);
  });
}

document.addEventListener('DOMContentLoaded', applyI18n);