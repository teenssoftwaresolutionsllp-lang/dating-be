import { relations } from "drizzle-orm";
import { blocks } from "./schema/blocks.schema";
import { conversationMembers } from "./schema/conversation-members.schema";
import { conversations } from "./schema/conversations.schema";
import { datingPreferences } from "./schema/dating-preferences.schema";
import { education } from "./schema/education.schema";
import { interests } from "./schema/interests.schema";
import { kycVerifications } from "./schema/kyc.schema";
import { languages } from "./schema/languages.schema";
import { matches } from "./schema/matches.schema";
import { messageReads } from "./schema/message-reads.schema";
import { messages } from "./schema/messages.schema";
import { notificationSettings } from "./schema/notification-settings.schema";
import { notifications } from "./schema/notifications.schema";
import { payments } from "./schema/payments.schema";
import { profileInterests } from "./schema/profile-interests.schema";
import { profileLanguages } from "./schema/profile-languages.schema";
import { profilePhotos } from "./schema/profile-photos.schema";
import { profiles } from "./schema/profiles.schema";
import { reports } from "./schema/reports.schema";
import { subscriptions } from "./schema/subscriptions.schema";
import { subscriptionPlans } from "./schema/subscription-plans.schema";
import { swipes } from "./schema/swipes.schema";
import { userDevices } from "./schema/user-devices.schema";
import { userSessions } from "./schema/sessions.schema";
import { userSettings } from "./schema/user-settings.schema";
import { users } from "./schema/users.schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(userSessions),
  profile: one(profiles),
  education: many(education),
  kycVerification: one(kycVerifications),
  profilePhotos: many(profilePhotos),
  datingPreferences: one(datingPreferences),
  swipes: many(swipes, { relationName: "swiper" }),
  targetedSwipes: many(swipes, { relationName: "swipeTarget" }),
  matchesAsUser1: many(matches, { relationName: "matchUser1" }),
  matchesAsUser2: many(matches, { relationName: "matchUser2" }),
  conversationMemberships: many(conversationMembers),
  sentMessages: many(messages, { relationName: "messageSender" }),
  messageReads: many(messageReads),
  blocks: many(blocks, { relationName: "blocker" }),
  blockedBy: many(blocks, { relationName: "blocked" }),
  reportsFiled: many(reports, { relationName: "reporter" }),
  reportsReceived: many(reports, { relationName: "reported" }),
  notifications: many(notifications),
  notificationSettings: one(notificationSettings),
  settings: one(userSettings),
  devices: many(userDevices),
  subscriptions: many(subscriptions),
  payments: many(payments),
}));

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  languages: many(profileLanguages),
  interests: many(profileInterests),
}));

export const languagesRelations = relations(languages, ({ many }) => ({
  profiles: many(profileLanguages),
}));

export const profileLanguagesRelations = relations(
  profileLanguages,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileLanguages.profileId],
      references: [profiles.id],
    }),
    language: one(languages, {
      fields: [profileLanguages.languageId],
      references: [languages.id],
    }),
  }),
);

export const interestsRelations = relations(interests, ({ many }) => ({
  profiles: many(profileInterests),
}));

export const profileInterestsRelations = relations(
  profileInterests,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileInterests.profileId],
      references: [profiles.id],
    }),
    interest: one(interests, {
      fields: [profileInterests.interestId],
      references: [interests.id],
    }),
  }),
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const educationRelations = relations(education, ({ one }) => ({
  user: one(users, { fields: [education.userId], references: [users.id] }),
}));

export const kycVerificationsRelations = relations(
  kycVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [kycVerifications.userId],
      references: [users.id],
    }),
  }),
);

export const profilePhotosRelations = relations(profilePhotos, ({ one }) => ({
  user: one(users, { fields: [profilePhotos.userId], references: [users.id] }),
}));

export const datingPreferencesRelations = relations(
  datingPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [datingPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const swipesRelations = relations(swipes, ({ one }) => ({
  swiper: one(users, {
    fields: [swipes.userId],
    references: [users.id],
    relationName: "swiper",
  }),
  target: one(users, {
    fields: [swipes.targetUserId],
    references: [users.id],
    relationName: "swipeTarget",
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
    relationName: "matchUser1",
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
    relationName: "matchUser2",
  }),
  conversation: one(conversations),
}));

export const conversationsRelations = relations(
  conversations,
  ({ many, one }) => ({
    match: one(matches, {
      fields: [conversations.matchId],
      references: [matches.id],
    }),
    members: many(conversationMembers),
    messages: many(messages),
  }),
);

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ many, one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "messageSender",
  }),
  reads: many(messageReads),
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  message: one(messages, {
    fields: [messageReads.messageId],
    references: [messages.id],
  }),
  user: one(users, { fields: [messageReads.userId], references: [users.id] }),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  blocker: one(users, {
    fields: [blocks.userId],
    references: [users.id],
    relationName: "blocker",
  }),
  blocked: one(users, {
    fields: [blocks.blockedUserId],
    references: [users.id],
    relationName: "blocked",
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  reported: one(users, {
    fields: [reports.reportedUserId],
    references: [users.id],
    relationName: "reported",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationSettingsRelations = relations(
  notificationSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationSettings.userId],
      references: [users.id],
    }),
  }),
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, { fields: [userDevices.userId], references: [users.id] }),
}));

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    subscriptions: many(subscriptions),
  }),
);

export const subscriptionsRelations = relations(
  subscriptions,
  ({ many, one }) => ({
    user: one(users, {
      fields: [subscriptions.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [subscriptions.planId],
      references: [subscriptionPlans.id],
    }),
    payments: many(payments),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));
