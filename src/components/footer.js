/**
 * Shared Footer Component
 */

export function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
    <div class="footer__inner">
      <a href="/" class="footer__logo">Limitless Adventure</a>
      <div class="footer__links">
        <a href="/travel-calculator.html" class="footer__link">Travel Calculator</a>
        <a href="/services.html" class="footer__link">Services</a>
        <a href="/about.html" class="footer__link">About</a>
        <a href="/contact.html" class="footer__link">Contact</a>
      </div>
      <p class="footer__copy">&copy; ${new Date().getFullYear()} Limitless Adventure. All rights reserved.</p>
    </div>
  `;

    document.body.appendChild(footer);
}
