import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';

// Save a trip estimate
export const save = mutation({
    args: {
        workosUserId: v.string(),
        origin: v.string(),
        destination: v.string(),
        departDate: v.string(),
        returnDate: v.optional(v.string()),
        adults: v.number(),
        cheapestPrice: v.optional(v.string()),
        currency: v.optional(v.string()),
        airline: v.optional(v.string()),
        stops: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('savedTrips', {
            ...args,
            savedAt: Date.now(),
        });
    },
});

// List all saved trips for a user
export const listByUser = query({
    args: { workosUserId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('savedTrips')
            .withIndex('by_user', (q) => q.eq('workosUserId', args.workosUserId))
            .order('desc')
            .collect();
    },
});

// Remove a saved trip
export const remove = mutation({
    args: { tripId: v.id('savedTrips') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tripId);
    },
});
