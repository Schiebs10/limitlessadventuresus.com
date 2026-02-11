import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    customers: defineTable({
        workosUserId: v.string(),
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        createdAt: v.number(),
    }).index('by_workos_id', ['workosUserId']),

    savedTrips: defineTable({
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
        savedAt: v.number(),
    }).index('by_user', ['workosUserId']),
});
