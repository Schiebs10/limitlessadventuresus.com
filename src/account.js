import './style.css';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { initFadeAnimations } from './components/animations.js';

renderNavbar();
renderFooter();
requestAnimationFrame(() => initFadeAnimations());

// ---- Account Logic ----

const loadingEl = document.getElementById('account-loading');
const guestEl = document.getElementById('account-guest');
const contentEl = document.getElementById('account-content');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const tripsListEl = document.getElementById('trips-list');
const tripsEmptyEl = document.getElementById('trips-empty');

async function init() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        const data = await res.json();

        loadingEl.style.display = 'none';

        if (!data.authenticated) {
            guestEl.style.display = 'block';
            return;
        }

        // Show user info
        const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Traveler';
        userNameEl.textContent = `Welcome, ${name}`;
        userEmailEl.textContent = data.email;
        contentEl.style.display = 'block';

        // Load saved trips
        loadTrips();
    } catch {
        loadingEl.style.display = 'none';
        guestEl.style.display = 'block';
    }
}

async function loadTrips() {
    try {
        const res = await fetch('/api/trips', { credentials: 'include' });
        const data = await res.json();

        if (!data.trips || data.trips.length === 0) {
            tripsListEl.style.display = 'none';
            tripsEmptyEl.style.display = 'block';
            return;
        }

        tripsEmptyEl.style.display = 'none';
        tripsListEl.innerHTML = data.trips
            .map(
                (trip) => `
      <div class="trip-card" data-trip-id="${trip._id}">
        <div class="trip-card__info">
          <div class="trip-card__route">
            <span class="trip-card__code">${trip.origin}</span>
            <span class="trip-card__arrow">→</span>
            <span class="trip-card__code">${trip.destination}</span>
          </div>
          <div class="trip-card__details">
            <span>${trip.departDate}${trip.returnDate ? ' — ' + trip.returnDate : ' (one-way)'}</span>
            <span>·</span>
            <span>${trip.adults} traveler${trip.adults > 1 ? 's' : ''}</span>
            ${trip.airline ? `<span>·</span><span>${trip.airline}</span>` : ''}
            ${trip.stops !== undefined ? `<span>·</span><span>${trip.stops === 0 ? 'Nonstop' : trip.stops + ' stop' + (trip.stops > 1 ? 's' : '')}</span>` : ''}
          </div>
        </div>
        <div class="trip-card__actions">
          ${trip.cheapestPrice ? `<span class="trip-card__price">$${trip.cheapestPrice}</span>` : ''}
          <button class="btn btn-outline trip-card__delete" data-id="${trip._id}" title="Delete trip">✕</button>
        </div>
      </div>
    `
            )
            .join('');

        // Attach delete handlers
        tripsListEl.querySelectorAll('.trip-card__delete').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const tripId = btn.dataset.id;
                btn.textContent = '...';
                btn.disabled = true;
                try {
                    await fetch(`/api/trips/${tripId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    loadTrips();
                } catch {
                    btn.textContent = '✕';
                    btn.disabled = false;
                }
            });
        });
    } catch {
        tripsListEl.innerHTML = '<p style="color: #c0392b;">Failed to load trips.</p>';
    }
}

init();
