/**
 * ============================================================================
 * DATABASE SCHEMA BARREL EXPORT
 * ============================================================================
 * Consolidates and exports all database entities, relations, types, and enums
 * across the 5 canonical schema layers:
 * 1. independent.ts -> Master lookup & catalog tables (0 dependencies)
 * 2. core.ts        -> Identity, authentication, profiles, settings, devices
 * 3. junction.ts    -> Many-to-Many join tables with composite primary keys
 * 4. dependent.ts   -> Discovery, matching, messaging, safety, moderation, logs
 * 5. payments.ts    -> Subscriptions, payments, webhook events, feature usage
 */

export * from "./independent";
export * from "./core";
export * from "./junction";
export * from "./dependent";
export * from "./payments";
