async function renderNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const { data } = await db.auth.getSession();
  const loggedIn = !!data.session;

  const links = [
    { text: 'Home', href: 'index.html' },
    { text: 'Posts', href: 'blog.html' },
  ];

   if (loggedIn) {
    links.push({ text: 'Write', href: 'write.html' });
    links.push({ text: 'My Blog', href: 'author.html?id=' + data.session.user.id });
    links.push({ text: 'Settings', href: 'settings.html' });
  } else {
    links.push({ text: 'Login', href: 'login.html' });
  }

  nav.innerHTML = '';

  links.forEach((item) => {
    const a = document.createElement('a');
    a.textContent = item.text;
    a.href = item.href;
    nav.append(a);
  });

  if (loggedIn) {
    const logout = document.createElement('a');
    logout.textContent = 'Logout';
    logout.href = '#';
    logout.addEventListener('click', async (event) => {
      event.preventDefault();
      await db.auth.signOut();
      window.location.href = 'index.html';
    });
    nav.append(logout);
  }
}

renderNav();

function renderFooter() {
  const footer = document.querySelector('footer');
  if (!footer) return;

  const links = document.createElement('p');
  links.className = 'footer-links';

  [
    { text: 'Terms', href: 'terms.html' },
    { text: 'Privacy', href: 'privacy.html' },
    { text: 'Report', href: 'report.html' },
    { text: 'Help', href: 'help.html' },
  ].forEach((item, index) => {
    if (index > 0) links.append(' · ');
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.text;
    links.append(a);
  });

  footer.append(links);
}

renderFooter();

function renderBrand() {
  const h1 = document.querySelector('header h1');
  if (!h1) return;

  const link = document.createElement('a');
  link.href = 'index.html';
  link.className = 'brand';

  const img = document.createElement('img');
  img.src = 'logo-96.png';
  img.alt = '';
  img.width = 36;
  img.height = 36;

  const name = document.createElement('span');
  name.textContent = 'Tidnote';

  link.append(img, name);
  h1.textContent = '';
  h1.append(link);
}

renderBrand();