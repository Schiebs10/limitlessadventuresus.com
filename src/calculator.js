import './style.css';
import { renderNavbar, getAuthUser } from './components/navbar.js';
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

// Track last search for save
let lastSearchData = null;
let lastSearchParams = null;

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
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return isoDuration;
    const hours = match[1] ? `${match[1]}h` : '';
    const mins = match[2] ? ` ${match[2]}m` : '';
    return `${hours}${mins}`.trim();
}

async function showResults(data) {
    hideAll();

    const cheapest = data.cheapest;
    amountEl.textContent = `$${parseFloat(cheapest.price).toLocaleString()}`;

    const stopsText = cheapest.stops === 0 ? 'Nonstop' : `${cheapest.stops} stop${cheapest.stops > 1 ? 's' : ''}`;
    detailsEl.textContent = `${cheapest.airline} • ${stopsText} • ${formatDuration(cheapest.duration)} • per person`;

    // Show additional offers
    if (data.otherOffers && data.otherOffers.length > 0) {
        offersEl.innerHTML = `
      <p style="font-family: var(--font-heading); text-transform: uppercase; font-size: 0.85rem; margin-bottom: 0.75rem;">
        Other options (${data.totalOffers} found)
      </p>
      ${data.otherOffers.map(offer => `
        <div style="padding: 0.75rem; background: var(--color-bg); border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span>${offer.airline} • ${offer.stops === 0 ? 'Nonstop' : offer.stops + ' stop' + (offer.stops > 1 ? 's' : '')}</span>
          <strong style="font-family: var(--font-heading);">$${parseFloat(offer.price).toLocaleString()}</strong>
        </div>
      `).join('')}
    `;
    } else {
        offersEl.innerHTML = '';
    }

    // Save button — only show if logged in
    const saveContainer = document.getElementById('save-trip-container');
    if (saveContainer) {
        const user = await getAuthUser();
        if (user) {
            saveContainer.innerHTML = `
        <button class="btn btn-primary" id="save-trip-btn" style="margin-top: 1.5rem; width: 100%;">
          💾 Save This Estimate
        </button>
      `;
            document.getElementById('save-trip-btn').addEventListener('click', saveTrip);
        } else {
            saveContainer.innerHTML = `
        <p style="margin-top: 1.5rem; color: #555; font-size: 0.9rem; text-align: center;">
          <a href="/auth/login" style="text-decoration: underline;">Sign in</a> to save this estimate
        </p>
      `;
        }
    }

    resultEl.style.display = 'block';
    resultEl.classList.add('visible');
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search Flights';
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveTrip() {
    if (!lastSearchData || !lastSearchParams) return;

    const btn = document.getElementById('save-trip-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/trips/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                origin: lastSearchParams.origin,
                destination: lastSearchParams.destination,
                departDate: lastSearchParams.departDate,
                returnDate: lastSearchParams.returnDate || undefined,
                adults: Number(lastSearchParams.adults) || 1,
                cheapestPrice: lastSearchData.cheapest.price,
                currency: lastSearchData.cheapest.currency,
                airline: lastSearchData.cheapest.airline,
                stops: lastSearchData.cheapest.stops,
            }),
        });

        if (res.ok) {
            btn.textContent = '✓ Saved to My Account!';
            btn.style.backgroundColor = '#27ae60';
        } else {
            const data = await res.json();
            throw new Error(data.error);
        }
    } catch (err) {
        btn.textContent = 'Error — Try Again';
        btn.style.backgroundColor = '#c0392b';
        btn.disabled = false;
        setTimeout(() => {
            btn.textContent = '💾 Save This Estimate';
            btn.style.backgroundColor = '';
        }, 3000);
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const origin = document.getElementById('origin').value.toUpperCase();
    const destination = document.getElementById('destination').value.toUpperCase();
    const departDate = document.getElementById('depart-date').value;
    const returnDate = document.getElementById('return-date').value;
    const adults = document.getElementById('travelers').value;

    lastSearchParams = { origin, destination, departDate, returnDate, adults };

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

        lastSearchData = data;
        showResults(data);
    } catch (err) {
        showError('Network error. Make sure the API server is running (npm run dev:all).');
    }
});
