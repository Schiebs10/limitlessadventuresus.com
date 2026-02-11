import './style.css';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { initFadeAnimations } from './components/animations.js';

renderNavbar();
renderFooter();
requestAnimationFrame(() => initFadeAnimations());

// Contact form handler
const form = document.getElementById('contact-form');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    // For now, show a success message (backend integration later)
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Message Sent! ✓';
    btn.style.backgroundColor = '#2d6a4f';
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
        btn.disabled = false;
        form.reset();
    }, 3000);
});
