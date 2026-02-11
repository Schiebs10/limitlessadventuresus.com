import './style.css';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { initFadeAnimations } from './components/animations.js';

renderNavbar();
renderFooter();
requestAnimationFrame(() => initFadeAnimations());

// --- Stripe Checkout ---

// Check for payment status from URL params (redirect back from Stripe)
const params = new URLSearchParams(window.location.search);
const status = params.get('status');
const banner = document.getElementById('payment-banner');

if (status === 'success') {
    banner.style.display = 'block';
    banner.style.background = '#d4edda';
    banner.style.color = '#155724';
    banner.innerHTML = `
    <h3 style="margin-bottom: 0.5rem;">🎉 Payment Successful!</h3>
    <p>Thank you for booking with Limitless Adventure. We'll be in touch with your trip details shortly.</p>
  `;
    // Clean up URL
    window.history.replaceState({}, '', '/services.html');
} else if (status === 'cancelled') {
    banner.style.display = 'block';
    banner.style.background = '#fff3cd';
    banner.style.color = '#856404';
    banner.innerHTML = `
    <h3 style="margin-bottom: 0.5rem;">Booking Cancelled</h3>
    <p>No charge was made. Feel free to browse our services and book when you're ready.</p>
  `;
    window.history.replaceState({}, '', '/services.html');
}

// Handle "Book Now" clicks
document.querySelectorAll('.btn-book').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const serviceId = btn.dataset.serviceId;
        const serviceName = btn.dataset.serviceName;
        const priceInCents = btn.dataset.price;
        const description = btn.dataset.description;

        // Show loading state on button
        const originalText = btn.textContent;
        btn.textContent = 'Redirecting...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId,
                    serviceName,
                    priceInCents,
                    description,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Checkout failed');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } catch (err) {
            console.error('Checkout error:', err);
            btn.textContent = 'Error — Try Again';
            btn.style.backgroundColor = '#c0392b';
            btn.disabled = false;

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
            }, 3000);
        }
    });
});
