/**
 * Shared Navbar Component
 * Renders the navigation bar on every page
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

    // Set initial scroll state
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    }
}
