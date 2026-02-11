import './style.css';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { initFadeAnimations } from './components/animations.js';

renderNavbar();
renderFooter();
requestAnimationFrame(() => initFadeAnimations());

// --- Amadeus Flight Search ---
const form = document.getElementById('calc-form');
const resultEl = document.getElementById('calc-result');
const loadingEl = document.getElementById('calc-loading');
const errorEl = document.getElementById('calc-error');
const amountEl = document.getElementById('result-amount');
const detailsEl = document.getElementById('result-details');
const offersEl = document.getElementById('result-offers');
const searchBtn = document.getElementById('search-btn');

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('depart-date').min = today;
document.getElementById('return-date').min = today;

function hideAll() {
    resultEl.classList.remove('visible');
    resultEl.style.display = 'none';
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    errorEl.classList.remove('visible');
}

function showLoading() {
    hideAll();
    loadingEl.style.display = 'block';
    loadingEl.classList.add('visible');
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
}

function showError(message) {
    hideAll();
    document.getElementById('error-message').textContent = message;
    errorEl.style.display = 'block';
    errorEl.classList.add('visible');
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search Flights';
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function formatDuration(isoDuration) {
    // PT2H30M → 2h 30m
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return isoDuration;
    const hours = match[1] ? `${match[1]}h` : '';
    const mins = match[2] ? ` ${match[2]}m` : '';
    return `${hours}${mins}`.trim();
}

function showResults(data) {
    hideAll();

    const cheapest = data.cheapest;
    amountEl.textContent = `$${parseFloat(cheapest.price).toLocaleString()}`;

    const stopsText = cheapest.stops === 0 ? 'Nonstop' : `${cheapest.stops} stop${cheapest.stops > 1 ? 's' : ''}`;
    const roundTrip = cheapest.itineraries > 1 ? 'Round trip' : 'One way';
    detailsEl.textContent = `${cheapest.airline} • ${stopsText} • ${formatDuration(cheapest.duration)} • ${roundTrip} • per person`;

    // Show additional offers
    if (data.offers.length > 1) {
        offersEl.innerHTML = `
      <p style="font-family: var(--font-heading); text-transform: uppercase; font-size: 0.85rem; margin-bottom: 0.75rem;">
        Other options (${data.count} found)
      </p>
      ${data.offers.slice(1).map(offer => `
        <div style="padding: 0.75rem; background: var(--color-bg); border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>${offer.airline} • ${offer.stops === 0 ? 'Nonstop' : offer.stops + ' stop' + (offer.stops > 1 ? 's' : '')} • ${formatDuration(offer.duration)}</span>
          <strong style="font-family: var(--font-heading);">$${parseFloat(offer.price).toLocaleString()}</strong>
        </div>
      `).join('')}
    `;
    } else {
        offersEl.innerHTML = '';
    }

    resultEl.style.display = 'block';
    resultEl.classList.add('visible');
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search Flights';
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const origin = document.getElementById('origin').value.toUpperCase();
    const destination = document.getElementById('destination').value.toUpperCase();
    const departDate = document.getElementById('depart-date').value;
    const returnDate = document.getElementById('return-date').value;
    const adults = document.getElementById('travelers').value;

    try {
        const res = await fetch('/api/flights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin,
                destination,
                departDate,
                returnDate: returnDate || undefined,
                adults,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            showError(data.error || 'Something went wrong.');
            return;
        }

        if (!data.found) {
            showError(data.message || 'No flights found for this route.');
            return;
        }

        showResults(data);
    } catch (err) {
        showError('Network error. Make sure the API server is running (npm run dev:all).');
    }
});
