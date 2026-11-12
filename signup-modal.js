// 회원가입 창(모달). nav.js의 openSignup()이 필요할 때 불러온다.
// "만 14세 이상, 약관 동의"는 여기서만 받는다(로그인에서는 받지 않는다).
const TERMS_VERSION = '2027-01-01'; // terms.html / privacy.html 시행일과 같아야 한다

function showSignupModal() {
  if (document.getElementById('signup-modal')) return;

  const previousFocus = document.activeElement;
  const onLoginPage = window.location.pathname.endsWith('login.html');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'signup-modal';

  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'signup-title');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('common.close'));

  const logo = document.createElement('img');
  logo.className = 'modal-logo';
  logo.src = 'logo-96.png';
  logo.alt = '';

  const title = document.createElement('h2');
  title.id = 'signup-title';
  title.textContent = t('signup.title');

  const sub = document.createElement('p');
  sub.className = 'modal-sub';
  sub.textContent = t('signup.subtitle');

  const form = document.createElement('form');
  form.className = 'write-form';
  form.noValidate = true;

  function makeField(labelKey, type, id, autocomplete) {
    const label = document.createElement('label');
    label.textContent = t(labelKey);
    label.setAttribute('for', id);
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.autocomplete = autocomplete;
    return { label: label, input: input };
  }

  const email = makeField('signup.email', 'email', 'signup-email', 'email');
  const pw = makeField('signup.password', 'password', 'signup-password', 'new-password');
  const pw2 = makeField('signup.confirm', 'password', 'signup-password2', 'new-password');

  // 비밀번호 보기
  const showLabel = document.createElement('label');
  showLabel.className = 'check';
  const showBox = document.createElement('input');
  showBox.type = 'checkbox';
  const showText = document.createElement('span');
  showText.textContent = t('signup.show');
  showLabel.append(showBox, showText);
  showBox.addEventListener('change', function () {
    const type = showBox.checked ? 'text' : 'password';
    pw.input.type = type;
    pw2.input.type = type;
  });

  // 약관 동의 (링크는 새 탭에서 열려서 입력한 내용이 사라지지 않는다)
  function legalLink(href, text) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = text;
    return a;
  }

  const agreeLabel = document.createElement('label');
  agreeLabel.className = 'check';
  const agreeBox = document.createElement('input');
  agreeBox.type = 'checkbox';
  const agreeText = document.createElement('span');
  agreeText.append(
    t('signup.agree_before'),
    legalLink('terms.html', t('signup.terms')),
    t('signup.agree_between'),
    legalLink('privacy.html', t('signup.privacy')),
    t('signup.agree_after')
  );
  agreeLabel.append(agreeBox, agreeText);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = t('signup.submit');

  const msg = document.createElement('p');
  msg.className = 'form-message';

  form.append(
    email.label, email.input,
    pw.label, pw.input,
    pw2.label, pw2.input,
    showLabel, agreeLabel,
    submit, msg
  );

  // 이미 계정이 있는 경우
  const foot = document.createElement('p');
  foot.className = 'modal-foot';
  foot.append(t('signup.have_account') + ' ');
  if (onLoginPage) {
    const stay = document.createElement('button');
    stay.type = 'button';
    stay.className = 'link-button';
    stay.textContent = t('signup.login');
    stay.addEventListener('click', closeModal);
    foot.append(stay);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.textContent = t('signup.login');
    foot.append(loginLink);
  }

  function closeModal() {
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
    overlay.remove();
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = dialog.querySelectorAll('a[href], button, input');
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  closeBtn.addEventListener('click', closeModal);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    msg.className = 'form-message';
    msg.textContent = '';

    if (!agreeBox.checked) {
      msg.textContent = t('signup.need_agree');
      return;
    }
    if (pw.input.value.length < 8) {
      msg.textContent = t('signup.pw_short');
      return;
    }
    if (pw.input.value !== pw2.input.value) {
      msg.textContent = t('signup.pw_mismatch');
      return;
    }

    submit.disabled = true;
    msg.textContent = t('signup.working');

    const { data, error } = await db.auth.signUp({
      email: email.input.value.trim(),
      password: pw.input.value,
      options: { data: { terms_version: TERMS_VERSION } },
    });

    if (error) {
      msg.textContent = error.message;
      submit.disabled = false;
      return;
    }

    if (data.session) {
      if (onLoginPage) {
        window.location.href = 'blog.html';
      } else {
        window.location.reload();
      }
      return;
    }

    msg.className = 'form-message ok';
    msg.textContent = t('signup.check_email');
  });

  dialog.append(closeBtn, logo, title, sub, form, foot);
  overlay.append(dialog);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeydown);
  email.input.focus();
}