async function renderNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const { data } = await db.auth.getSession();
  const loggedIn = !!data.session;

  const links = [
    { text: 'About', href: 'index.html' },
    { text: 'Posts', href: 'blog.html' },
  ];

   if (loggedIn) {
    links.push({ text: 'Write', href: 'write.html' });
    links.push({ text: 'My Blog', href: 'author.html?id=' + data.session.user.id });
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