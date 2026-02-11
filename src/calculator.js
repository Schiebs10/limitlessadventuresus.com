import './style.css';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { initFadeAnimations } from './components/animations.js';

renderNavbar();
renderFooter();
requestAnimationFrame(() => initFadeAnimations());

// Travel Calculator Logic
const baseCosts = {
    caribbean: 200,
    europe: 180,
    asia: 120,
    africa: 250,
    'south-america': 150,
    oceania: 220,
};

const tierMultipliers = {
    budget: 0.7,
    standard: 1.0,
    premium: 1.6,
    luxury: 2.8,
};

const form = document.getElementById('calc-form');
const resultEl = document.getElementById('calc-result');
const amountEl = document.getElementById('result-amount');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const destination = document.getElementById('destination').value;
    const duration = parseInt(document.getElementById('duration').value, 10);
    const travelers = parseInt(document.getElementById('travelers').value, 10);
    const tier = document.getElementById('tier').value;

    if (!destination || !duration || !travelers || !tier) return;

    const dailyCost = baseCosts[destination] * tierMultipliers[tier];
    const totalPerPerson = Math.round(dailyCost * duration);
    const totalTrip = totalPerPerson * travelers;

    amountEl.textContent = `$${totalPerPerson.toLocaleString()}`;
    resultEl.classList.add('visible');

    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
