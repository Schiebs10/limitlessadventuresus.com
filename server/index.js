import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Amadeus from 'amadeus';
import Stripe from 'stripe';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Amadeus Client ---
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

// --- Stripe Client ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =====================
// ROUTES
// =====================

/**
 * POST /api/flights
 * Search for flight offers via Amadeus
 *
 * Body: { origin, destination, departDate, returnDate, adults }
 *   - origin: IATA code (e.g. "JFK")
 *   - destination: IATA code (e.g. "CDG")
 *   - departDate: "YYYY-MM-DD"
 *   - returnDate: "YYYY-MM-DD" (optional for one-way)
 *   - adults: number
 */
app.post('/api/flights', async (req, res) => {
    try {
        const { origin, destination, departDate, returnDate, adults } = req.body;

        if (!origin || !destination || !departDate || !adults) {
            return res.status(400).json({ error: 'Missing required fields: origin, destination, departDate, adults' });
        }

        const params = {
            originLocationCode: origin.toUpperCase(),
            destinationLocationCode: destination.toUpperCase(),
            departureDate: departDate,
            adults: parseInt(adults, 10),
            max: 5,
            currencyCode: 'USD',
        };

        if (returnDate) {
            params.returnDate = returnDate;
        }

        const response = await amadeus.shopping.flightOffersSearch.get(params);
        const offers = JSON.parse(response.body);

        if (!offers.data || offers.data.length === 0) {
            return res.json({
                found: false,
                message: 'No flight offers found for this route and date.',
            });
        }

        // Extract the cheapest offers
        const results = offers.data.map((offer) => {
            const segments = offer.itineraries[0].segments;
            const firstSeg = segments[0];
            const lastSeg = segments[segments.length - 1];

            return {
                price: offer.price.grandTotal,
                currency: offer.price.currency,
                airline: firstSeg.carrierCode,
                departure: firstSeg.departure.iataCode,
                arrival: lastSeg.arrival.iataCode,
                departureTime: firstSeg.departure.at,
                arrivalTime: lastSeg.arrival.at,
                stops: segments.length - 1,
                duration: offer.itineraries[0].duration,
                itineraries: offer.itineraries.length,
            };
        });

        res.json({
            found: true,
            count: results.length,
            cheapest: results[0],
            offers: results,
        });
    } catch (err) {
        console.error('Amadeus API error:', err?.response?.body || err.message);
        res.status(500).json({
            error: 'Failed to search flights. Check your Amadeus API credentials.',
            details: err?.response?.body || err.message,
        });
    }
});

/**
 * POST /api/checkout
 * Create a Stripe Checkout session
 *
 * Body: { serviceId, serviceName, priceInCents, description }
 */
app.post('/api/checkout', async (req, res) => {
    try {
        const { serviceId, serviceName, priceInCents, description } = req.body;

        if (!serviceName || !priceInCents) {
            return res.status(400).json({ error: 'Missing required fields: serviceName, priceInCents' });
        }

        const origin = req.headers.origin || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: serviceName,
                            description: description || `Limitless Adventure — ${serviceName}`,
                        },
                        unit_amount: parseInt(priceInCents, 10),
                    },
                    quantity: 1,
                },
            ],
            success_url: `${origin}/services.html?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${origin}/services.html?status=cancelled`,
            metadata: {
                serviceId: serviceId || '',
            },
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        console.error('Stripe error:', err.message);
        res.status(500).json({
            error: 'Failed to create checkout session. Check your Stripe API credentials.',
            details: err.message,
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`✈️  Limitless Adventures API server running on http://localhost:${PORT}`);
});
