import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Amadeus from 'amadeus';
import Stripe from 'stripe';
import { WorkOS } from '@workos-inc/node';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- Clients ---
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const workos = new WorkOS(process.env.WORKOS_API_KEY);

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

// JWT secret derived from the cookie password
const JWT_SECRET = process.env.WORKOS_COOKIE_PASSWORD || 'dev-fallback-secret-change-me';
const COOKIE_NAME = 'la_session';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function getUser(req) {
    try {
        const token = req.cookies[COOKIE_NAME];
        if (!token) return null;
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function requireAuth(req, res, next) {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
}

// ============================================================
// AUTH ROUTES
// ============================================================

// Redirect to WorkOS AuthKit login
app.get('/auth/login', (req, res) => {
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
        provider: 'authkit',
        redirectUri: process.env.WORKOS_REDIRECT_URI,
        clientId: process.env.WORKOS_CLIENT_ID,
    });
    res.redirect(authorizationUrl);
});

// Callback from WorkOS after login
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${FRONTEND_URL}/?auth_error=no_code`);
    }

    try {
        const authResponse = await workos.userManagement.authenticateWithCode({
            code,
            clientId: process.env.WORKOS_CLIENT_ID,
        });

        const { user } = authResponse;

        // Upsert customer in Convex
        try {
            await convex.mutation(anyApi.customers.upsert, {
                workosUserId: user.id,
                email: user.email,
                firstName: user.firstName || undefined,
                lastName: user.lastName || undefined,
            });
        } catch (convexErr) {
            console.error('Convex upsert error (non-fatal):', convexErr.message);
        }

        // Create JWT session token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set HTTP-only cookie
        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });

        res.redirect(`${FRONTEND_URL}/account.html`);
    } catch (err) {
        console.error('Auth callback error:', err);
        res.redirect(`${FRONTEND_URL}/?auth_error=callback_failed`);
    }
});

// Logout
app.get('/auth/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.redirect(`${FRONTEND_URL}/`);
});

// ============================================================
// USER API
// ============================================================

// Get current user
app.get('/api/me', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ authenticated: false });
    res.json({
        authenticated: true,
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
    });
});

// ============================================================
// TRIP ROUTES
// ============================================================

// Save a trip estimate
app.post('/api/trips/save', requireAuth, async (req, res) => {
    try {
        const { origin, destination, departDate, returnDate, adults, cheapestPrice, currency, airline, stops } = req.body;

        if (!origin || !destination || !departDate) {
            return res.status(400).json({ error: 'origin, destination, departDate are required' });
        }

        const tripId = await convex.mutation(anyApi.savedTrips.save, {
            workosUserId: req.user.userId,
            origin,
            destination,
            departDate,
            returnDate: returnDate || undefined,
            adults: Number(adults) || 1,
            cheapestPrice: cheapestPrice || undefined,
            currency: currency || undefined,
            airline: airline || undefined,
            stops: stops !== undefined ? Number(stops) : undefined,
        });

        res.json({ success: true, tripId });
    } catch (err) {
        console.error('Save trip error:', err);
        res.status(500).json({ error: 'Failed to save trip' });
    }
});

// Get saved trips for current user
app.get('/api/trips', requireAuth, async (req, res) => {
    try {
        const trips = await convex.query(anyApi.savedTrips.listByUser, {
            workosUserId: req.user.userId,
        });
        res.json({ trips });
    } catch (err) {
        console.error('Get trips error:', err);
        res.status(500).json({ error: 'Failed to load trips' });
    }
});

// Delete a saved trip
app.delete('/api/trips/:id', requireAuth, async (req, res) => {
    try {
        await convex.mutation(anyApi.savedTrips.remove, {
            tripId: req.params.id,
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Delete trip error:', err);
        res.status(500).json({ error: 'Failed to delete trip' });
    }
});

// ============================================================
// AMADEUS FLIGHT SEARCH
// ============================================================

app.post('/api/flights', async (req, res) => {
    const { origin, destination, departDate, returnDate, adults } = req.body;

    if (!origin || !destination || !departDate) {
        return res.status(400).json({ error: 'origin, destination, and departDate are required.' });
    }

    try {
        const searchParams = {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: departDate,
            adults: adults || '1',
            max: 5,
            currencyCode: 'USD',
        };

        if (returnDate) searchParams.returnDate = returnDate;

        const response = await amadeus.shopping.flightOffersSearch.get(searchParams);
        const offers = JSON.parse(response.body);

        if (!offers.data || offers.data.length === 0) {
            return res.json({ found: false, message: 'No flights found for those dates.' });
        }

        const cheapest = offers.data[0];
        res.json({
            found: true,
            cheapest: {
                price: cheapest.price.total,
                currency: cheapest.price.currency,
                segments: cheapest.itineraries[0].segments,
                duration: cheapest.itineraries[0].duration,
                stops: cheapest.itineraries[0].segments.length - 1,
                airline: cheapest.itineraries[0].segments[0].carrierCode,
            },
            totalOffers: offers.data.length,
            otherOffers: offers.data.slice(1).map((o) => ({
                price: o.price.total,
                currency: o.price.currency,
                airline: o.itineraries[0].segments[0].carrierCode,
                stops: o.itineraries[0].segments.length - 1,
            })),
        });
    } catch (err) {
        console.error('Amadeus error:', err?.response?.body || err.message);
        res.status(500).json({ error: 'Failed to search flights. Check your Amadeus API credentials.' });
    }
});

// ============================================================
// STRIPE CHECKOUT
// ============================================================

app.post('/api/checkout', async (req, res) => {
    const { serviceId, serviceName, priceInCents, description } = req.body;

    if (!serviceId || !serviceName || !priceInCents) {
        return res.status(400).json({ error: 'serviceId, serviceName, and priceInCents are required.' });
    }

    try {
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
                        unit_amount: Number(priceInCents),
                    },
                    quantity: 1,
                },
            ],
            success_url: `${FRONTEND_URL}/services.html?status=success`,
            cancel_url: `${FRONTEND_URL}/services.html?status=cancelled`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe error:', err.message);
        res.status(500).json({ error: 'Failed to create checkout session. Check your Stripe API credentials.' });
    }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
    console.log(`✈️  Limitless Adventures API server running on http://localhost:${PORT}`);
});
