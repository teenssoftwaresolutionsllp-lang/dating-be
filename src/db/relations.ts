import { relations } from "drizzle-orm";
import {
  languages,
  interests,
  subscriptionPlans,
  subscriptionFeatures,
  users,
  profiles,
  userSessions,
  otpVerifications,
  passwordResetTokens,
  userLoginEvents,
  userDevices,
  userSettings,
  notificationSettings,
  profileLanguages,
  profileInterests,
  conversationMembers,
  messageReads,
  planFeatures,
  education,
  kycVerifications,
  profilePhotos,
  mediaAssets,
  datingPreferences,
  swipes,
  swipeEvents,
  matches,
  conversations,
  messages,
  blocks,
  reports,
  reportActions,
  userSuspensions,
  adminAuditLogs,
  notifications,
  pushNotificationDeliveries,
  subscriptions,
  payments,
  featureUsage,
} from "./schema";

/**
 * ============================================================================
 * DRIZZLE ORM RELATIONS DEFINITIONS (Full 35-Table Bidirectional Mapping)
 * ============================================================================
 */

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(profiles),
  sessions: many(userSessions),
  devices: many(userDevices),
  settings: one(userSettings),
  notificationSettings: one(notificationSettings),
  education: many(education),
  kycVerification: one(kycVerifications),
  kycReviewsConducted: many(kycVerifications, { relationName: "kycReviewer" }),
  profilePhotos: many(profilePhotos),
  mediaAssets: many(mediaAssets),
  datingPreferences: one(datingPreferences),
  swipes: many(swipes, { relationName: "swiper" }),
  targetedSwipes: many(swipes, { relationName: "swipeTarget" }),
  swipeEvents: many(swipeEvents, { relationName: "eventSwiper" }),
  targetedSwipeEvents: many(swipeEvents, { relationName: "eventTarget" }),
  matchesAsUser1: many(matches, { relationName: "matchUser1" }),
  matchesAsUser2: many(matches, { relationName: "matchUser2" }),
  unmatchedMatches: many(matches, { relationName: "unmatchedBy" }),
  conversationMemberships: many(conversationMembers),
  sentMessages: many(messages, { relationName: "messageSender" }),
  messageReads: many(messageReads),
  blocks: many(blocks, { relationName: "blocker" }),
  blockedBy: many(blocks, { relationName: "blocked" }),
  reportsFiled: many(reports, { relationName: "reporter" }),
  reportsReceived: many(reports, { relationName: "reported" }),
  reportActionsTaken: many(reportActions, { relationName: "moderatorAction" }),
  suspensionsReceived: many(userSuspensions, {
    relationName: "suspendedUser",
  }),
  suspensionsIssued: many(userSuspensions, {
    relationName: "suspensionIssuer",
  }),
  adminAuditLogs: many(adminAuditLogs, { relationName: "adminActor" }),
  notifications: many(notifications),
  subscriptions: many(subscriptions),
  payments: many(payments),
  featureUsage: many(featureUsage),
  loginEvents: many(userLoginEvents),
  passwordResetTokens: many(passwordResetTokens),
  otpVerifications: many(otpVerifications),
}));

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
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
  })
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
  })
);

export const userDevicesRelations = relations(userDevices, ({ many, one }) => ({
  user: one(users, {
    fields: [userDevices.userId],
    references: [users.id],
  }),
  sessions: many(userSessions),
  deliveries: many(pushNotificationDeliveries),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  device: one(userDevices, {
    fields: [userSessions.deviceId],
    references: [userDevices.id],
  }),
}));

export const otpVerificationsRelations = relations(
  otpVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [otpVerifications.userId],
      references: [users.id],
    }),
  })
);

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);

export const userLoginEventsRelations = relations(
  userLoginEvents,
  ({ one }) => ({
    user: one(users, {
      fields: [userLoginEvents.userId],
      references: [users.id],
    }),
  })
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const notificationSettingsRelations = relations(
  notificationSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationSettings.userId],
      references: [users.id],
    }),
  })
);

export const educationRelations = relations(education, ({ one }) => ({
  user: one(users, {
    fields: [education.userId],
    references: [users.id],
  }),
}));

export const kycVerificationsRelations = relations(
  kycVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [kycVerifications.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [kycVerifications.reviewedBy],
      references: [users.id],
      relationName: "kycReviewer",
    }),
  })
);

export const profilePhotosRelations = relations(profilePhotos, ({ one }) => ({
  user: one(users, {
    fields: [profilePhotos.userId],
    references: [users.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  user: one(users, {
    fields: [mediaAssets.userId],
    references: [users.id],
  }),
}));

export const datingPreferencesRelations = relations(
  datingPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [datingPreferences.userId],
      references: [users.id],
    }),
  })
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

export const swipeEventsRelations = relations(swipeEvents, ({ one }) => ({
  swiper: one(users, {
    fields: [swipeEvents.userId],
    references: [users.id],
    relationName: "eventSwiper",
  }),
  target: one(users, {
    fields: [swipeEvents.targetUserId],
    references: [users.id],
    relationName: "eventTarget",
  }),
}));

export const matchesRelations = relations(matches, ({ many, one }) => ({
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
  unmatchedByUser: one(users, {
    fields: [matches.unmatchedBy],
    references: [users.id],
    relationName: "unmatchedBy",
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
  })
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
  })
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
  replyTo: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
    relationName: "messageReplies",
  }),
  replies: many(messages, {
    relationName: "messageReplies",
  }),
  reads: many(messageReads),
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  message: one(messages, {
    fields: [messageReads.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReads.userId],
    references: [users.id],
  }),
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

export const reportsRelations = relations(reports, ({ many, one }) => ({
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
  actions: many(reportActions),
}));

export const reportActionsRelations = relations(reportActions, ({ one }) => ({
  report: one(reports, {
    fields: [reportActions.reportId],
    references: [reports.id],
  }),
  moderator: one(users, {
    fields: [reportActions.moderatorId],
    references: [users.id],
    relationName: "moderatorAction",
  }),
}));

export const userSuspensionsRelations = relations(
  userSuspensions,
  ({ one }) => ({
    user: one(users, {
      fields: [userSuspensions.userId],
      references: [users.id],
      relationName: "suspendedUser",
    }),
    creator: one(users, {
      fields: [userSuspensions.createdBy],
      references: [users.id],
      relationName: "suspensionIssuer",
    }),
  })
);

export const adminAuditLogsRelations = relations(
  adminAuditLogs,
  ({ one }) => ({
    admin: one(users, {
      fields: [adminAuditLogs.adminId],
      references: [users.id],
      relationName: "adminActor",
    }),
  })
);

export const notificationsRelations = relations(
  notifications,
  ({ many, one }) => ({
    user: one(users, {
      fields: [notifications.userId],
      references: [users.id],
    }),
    deliveries: many(pushNotificationDeliveries),
  })
);

export const pushNotificationDeliveriesRelations = relations(
  pushNotificationDeliveries,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [pushNotificationDeliveries.notificationId],
      references: [notifications.id],
    }),
    device: one(userDevices, {
      fields: [pushNotificationDeliveries.deviceId],
      references: [userDevices.id],
    }),
  })
);

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    subscriptions: many(subscriptions),
    planFeatures: many(planFeatures),
  })
);

export const subscriptionFeaturesRelations = relations(
  subscriptionFeatures,
  ({ many }) => ({
    planFeatures: many(planFeatures),
    usages: many(featureUsage),
  })
);

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [planFeatures.planId],
    references: [subscriptionPlans.id],
  }),
  feature: one(subscriptionFeatures, {
    fields: [planFeatures.featureId],
    references: [subscriptionFeatures.id],
  }),
}));

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
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const featureUsageRelations = relations(featureUsage, ({ one }) => ({
  user: one(users, {
    fields: [featureUsage.userId],
    references: [users.id],
  }),
  feature: one(subscriptionFeatures, {
    fields: [featureUsage.featureId],
    references: [subscriptionFeatures.id],
  }),
}));
