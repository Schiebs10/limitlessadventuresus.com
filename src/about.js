import './style.css';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { initFadeAnimations } from './components/animations.js';

renderNavbar();
renderFooter();
requestAnimationFrame(() => initFadeAnimations());
