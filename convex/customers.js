import { mutation, query } from './_generated/server.js';
import { v } from 'convex/values';

// Create or update a customer when they log in
export const upsert = mutation({
    args: {
        workosUserId: v.string(),
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('customers')
            .withIndex('by_workos_id', (q) => q.eq('workosUserId', args.workosUserId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                firstName: args.firstName,
                lastName: args.lastName,
            });
            return existing._id;
        }

        return await ctx.db.insert('customers', {
            ...args,
            createdAt: Date.now(),
        });
    },
});

// Get a customer by their WorkOS user ID
export const getByWorkosId = query({
    args: { workosUserId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('customers')
            .withIndex('by_workos_id', (q) => q.eq('workosUserId', args.workosUserId))
            .first();
    },
});
