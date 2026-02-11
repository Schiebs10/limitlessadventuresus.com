/**
 * Shared Navbar Component
 * Renders the navigation bar with auth state
 */

export function renderNavbar() {
  const currentPath = window.location.pathname;

  const links = [
    { href: '/travel-calculator.html', label: 'Travel Calculator' },
    { href: '/services.html', label: 'Services' },
    { href: '/about.html', label: 'About' },
    { href: '/contact.html', label: 'Contact' },
  ];

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';
  navbar.id = 'navbar';
  navbar.innerHTML = `
    <a href="/" class="navbar__logo">Limitless Adventure</a>
    <div class="navbar__links">
      ${links.map(link => `
        <a href="${link.href}" class="navbar__link ${currentPath === link.href ? 'active' : ''}">${link.label}</a>
      `).join('')}
      <a href="/auth/login" class="navbar__link navbar__auth-link" id="auth-link">Sign In</a>
    </div>
    <button class="navbar__hamburger" id="hamburger" aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
  `;

  // Mobile nav overlay
  const mobileNav = document.createElement('div');
  mobileNav.className = 'mobile-nav';
  mobileNav.id = 'mobile-nav';
  mobileNav.innerHTML = `
    <a href="/">Home</a>
    ${links.map(link => `<a href="${link.href}">${link.label}</a>`).join('')}
    <a href="/auth/login" id="mobile-auth-link">Sign In</a>
  `;

  document.body.prepend(mobileNav);
  document.body.prepend(navbar);

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('open');
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  });

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  }

  // Check auth state
  checkAuth();
}

async function checkAuth() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();

    const authLink = document.getElementById('auth-link');
    const mobileAuthLink = document.getElementById('mobile-auth-link');

    if (data.authenticated) {
      const displayName = data.firstName || data.email.split('@')[0];

      if (authLink) {
        authLink.href = '/account.html';
        authLink.textContent = displayName;
        authLink.classList.add('navbar__auth-link--active');
      }
      if (mobileAuthLink) {
        mobileAuthLink.href = '/account.html';
        mobileAuthLink.textContent = displayName;
      }
    }
  } catch {
    // Not authenticated — keep Sign In link
  }
}

// Export for other modules to check auth
export async function getAuthUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    return data.authenticated ? data : null;
  } catch {
    return null;
  }
}
