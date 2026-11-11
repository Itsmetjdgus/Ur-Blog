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
    'profile.counter': '{n}/100'
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
    'profile.counter': '{n}/100'
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