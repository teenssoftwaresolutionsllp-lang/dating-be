import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "./index";
import {
  languages,
  interests,
  subscriptionPlans,
  subscriptionFeatures,
  planFeatures,
  users,
  profiles,
  userDevices,
  userSettings,
  notificationSettings,
  profileLanguages,
  profileInterests,
  education,
  kycVerifications,
  profilePhotos,
  datingPreferences,
  swipes,
  swipeEvents,
  matches,
  conversations,
  conversationMembers,
  messages,
  messageReads,
  subscriptions,
  payments,
  featureUsage,
} from "./schema";

/**
 * ============================================================================
 * DATABASE SEED SCRIPT (Strict Topological Order)
 * ============================================================================
 * Seeds the database with production-grade master catalogs, subscription tiers,
 * test users, verified profiles, swipes, matches, and chat conversations.
 */

async function seed() {
  console.log("🌱 Starting database seeding in strict dependency order...\n");

  try {
    // ------------------------------------------------------------------------
    // STEP 1: INDEPENDENT CATALOGS & MASTER DATA (0 Foreign Dependencies)
    // ------------------------------------------------------------------------
    console.log("📦 1/5 Seeding independent lookup tables...");

    const insertedLanguages = await db
      .insert(languages)
      .values([
        { name: "English" },
        { name: "Hindi" },
        { name: "Spanish" },
        { name: "French" },
        { name: "German" },
        { name: "Telugu" },
        { name: "Tamil" },
        { name: "Kannada" },
        { name: "Malayalam" },
        { name: "Japanese" },
      ])
      .onConflictDoNothing()
      .returning();

    const insertedInterests = await db
      .insert(interests)
      .values([
        { name: "Photography", category: "Creative" },
        { name: "Hiking & Outdoors", category: "Adventure" },
        { name: "Coffee & Cafes", category: "Lifestyle" },
        { name: "Cooking & Foodie", category: "Lifestyle" },
        { name: "Live Music & Concerts", category: "Entertainment" },
        { name: "Fitness & Gym", category: "Wellness" },
        { name: "Reading & Books", category: "Intellectual" },
        { name: "Tech & Coding", category: "Intellectual" },
        { name: "Travel & Backpacking", category: "Adventure" },
        { name: "Gaming & Esports", category: "Entertainment" },
        { name: "Yoga & Meditation", category: "Wellness" },
        { name: "Art & Museums", category: "Creative" },
      ])
      .onConflictDoNothing()
      .returning();

    const [planFree, planGold, planPlatinum] = await db
      .insert(subscriptionPlans)
      .values([
        {
          name: "Free",
          price: "0.00",
          duration: "lifetime",
          features: "Standard daily swipes, basic discovery filters",
          isActive: true,
        },
        {
          name: "Gold",
          price: "499.00",
          duration: "monthly",
          features: "Unlimited likes, 5 Super Likes per day, See who liked you",
          isActive: true,
        },
        {
          name: "Platinum",
          price: "999.00",
          duration: "monthly",
          features:
            "Priority likes, message before matching, unlimited rewind, 1 free monthly boost",
          isActive: true,
        },
      ])
      .onConflictDoNothing()
      .returning();

    const [featLikes, featSuperLike, featSeeWhoLiked, featBoost, featFilters] =
      await db
        .insert(subscriptionFeatures)
        .values([
          {
            code: "UNLIMITED_LIKES",
            name: "Unlimited Swipes",
            description: "Swipe right without daily quota limits",
          },
          {
            code: "SUPER_LIKE",
            name: "Super Like",
            description: "Highlight your profile to stand out in their deck",
          },
          {
            code: "SEE_WHO_LIKED",
            name: "See Who Liked You",
            description: "View the secret admirer grid instantly",
          },
          {
            code: "PROFILE_BOOST",
            name: "Profile Boost",
            description: "Be the top profile in your area for 30 minutes",
          },
          {
            code: "ADVANCED_FILTERS",
            name: "Advanced Discovery Filters",
            description: "Filter by education, verified status, and intentions",
          },
        ])
        .onConflictDoNothing()
        .returning();

    // Entitlements (Plan Features)
    if (planGold && featLikes && featSuperLike && featSeeWhoLiked) {
      await db
        .insert(planFeatures)
        .values([
          { planId: planGold.id, featureId: featLikes.id, limitValue: null },
          { planId: planGold.id, featureId: featSuperLike.id, limitValue: 5 },
          {
            planId: planGold.id,
            featureId: featSeeWhoLiked.id,
            limitValue: null,
          },
        ])
        .onConflictDoNothing();
    }

    if (
      planPlatinum &&
      featLikes &&
      featSuperLike &&
      featSeeWhoLiked &&
      featBoost &&
      featFilters
    ) {
      await db
        .insert(planFeatures)
        .values([
          {
            planId: planPlatinum.id,
            featureId: featLikes.id,
            limitValue: null,
          },
          {
            planId: planPlatinum.id,
            featureId: featSuperLike.id,
            limitValue: 10,
          },
          {
            planId: planPlatinum.id,
            featureId: featSeeWhoLiked.id,
            limitValue: null,
          },
          { planId: planPlatinum.id, featureId: featBoost.id, limitValue: 2 },
          {
            planId: planPlatinum.id,
            featureId: featFilters.id,
            limitValue: null,
          },
        ])
        .onConflictDoNothing();
    }

    console.log("   ✓ Master lookups, plans, and features seeded.");

    // ------------------------------------------------------------------------
    // STEP 2: CORE IDENTITY & USERS (Root User Entities)
    // ------------------------------------------------------------------------
    console.log("👥 2/5 Seeding core users, profiles, settings, and devices...");

    const passwordHash = await bcrypt.hash("Password@123", 10);

    const [adminUser, modUser, userAarav, userAnanya, userRohan, userPriya] =
      await db
        .insert(users)
        .values([
          {
            email: "admin@datingapp.com",
            phone: "+919876543210",
            passwordHash,
            role: "admin",
            status: "active",
            emailVerified: true,
            phoneVerified: true,
          },
          {
            email: "moderator@datingapp.com",
            phone: "+919876543211",
            passwordHash,
            role: "moderator",
            status: "active",
            emailVerified: true,
            phoneVerified: true,
          },
          {
            email: "aarav.sharma@example.com",
            phone: "+919876543212",
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true,
            phoneVerified: true,
          },
          {
            email: "ananya.verma@example.com",
            phone: "+919876543213",
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true,
            phoneVerified: true,
          },
          {
            email: "rohan.mehta@example.com",
            phone: "+919876543214",
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true,
            phoneVerified: true,
          },
          {
            email: "priya.nair@example.com",
            phone: "+919876543215",
            passwordHash,
            role: "user",
            status: "active",
            emailVerified: true,
            phoneVerified: true,
          },
        ])
        .onConflictDoNothing()
        .returning();

    const candidateUsers = [userAarav, userAnanya, userRohan, userPriya].filter(
      Boolean
    );

    // Seed Settings & Devices for users
    for (const u of [adminUser, modUser, ...candidateUsers]) {
      if (!u) continue;
      await db
        .insert(userSettings)
        .values({
          userId: u.id,
          profileVisibility: true,
          showVerifiedOnly: false,
          locationVisibility: "approximate",
          onlineStatusVisibility: true,
        })
        .onConflictDoNothing();

      await db
        .insert(notificationSettings)
        .values({
          userId: u.id,
          newMatches: true,
          newMessages: true,
          newLikes: true,
          pushEnabled: true,
          emailEnabled: true,
        })
        .onConflictDoNothing();
    }

    // Candidate Profiles
    let profileAarav, profileAnanya, profileRohan, profilePriya;

    if (userAarav) {
      [profileAarav] = await db
        .insert(profiles)
        .values({
          userId: userAarav.id,
          name: "Aarav Sharma",
          dateOfBirth: "1997-04-15",
          gender: "male",
          heightCm: 180,
          bio: "Software Architect & Weekend trekker. Searching for good conversations and great filter coffee.",
          relationshipStatus: "single",
          city: "Bengaluru",
          state: "Karnataka",
          country: "India",
          latitude: 12.9716,
          longitude: 77.5946,
        })
        .onConflictDoNothing()
        .returning();
    }

    if (userAnanya) {
      [profileAnanya] = await db
        .insert(profiles)
        .values({
          userId: userAnanya.id,
          name: "Ananya Verma",
          dateOfBirth: "1998-08-22",
          gender: "female",
          heightCm: 165,
          bio: "UI/UX Designer. Obsessed with indie cinema, matcha lattes, and rooftop sunsets 🌅",
          relationshipStatus: "single",
          city: "Bengaluru",
          state: "Karnataka",
          country: "India",
          latitude: 12.9784,
          longitude: 77.6408,
        })
        .onConflictDoNothing()
        .returning();
    }

    if (userRohan) {
      [profileRohan] = await db
        .insert(profiles)
        .values({
          userId: userRohan.id,
          name: "Rohan Mehta",
          dateOfBirth: "1995-11-03",
          gender: "male",
          heightCm: 175,
          bio: "Product Manager. Love marathon running, podcasts, and discovering hidden cocktail bars.",
          relationshipStatus: "single",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          latitude: 19.076,
          longitude: 72.8777,
        })
        .onConflictDoNothing()
        .returning();
    }

    if (userPriya) {
      [profilePriya] = await db
        .insert(profiles)
        .values({
          userId: userPriya.id,
          name: "Priya Nair",
          dateOfBirth: "1999-01-19",
          gender: "female",
          heightCm: 168,
          bio: "Architectural photographer. Dog mom to a golden retriever named Bruno 🐾",
          relationshipStatus: "single",
          city: "Bengaluru",
          state: "Karnataka",
          country: "India",
          latitude: 12.9352,
          longitude: 77.6245,
        })
        .onConflictDoNothing()
        .returning();
    }

    console.log("   ✓ Users, profiles, devices, and settings created.");

    // ------------------------------------------------------------------------
    // STEP 3: JUNCTION TABLES & M:N ASSOCIATIONS
    // ------------------------------------------------------------------------
    console.log("🔗 3/5 Seeding profile associations and preferences...");

    if (profileAarav && insertedLanguages.length && insertedInterests.length) {
      await db
        .insert(profileLanguages)
        .values([
          { profileId: profileAarav.id, languageId: insertedLanguages[0].id },
          { profileId: profileAarav.id, languageId: insertedLanguages[1].id },
        ])
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: profileAarav.id, interestId: insertedInterests[1].id }, // Hiking
          { profileId: profileAarav.id, interestId: insertedInterests[7].id }, // Tech
        ])
        .onConflictDoNothing();
    }

    if (profileAnanya && insertedLanguages.length && insertedInterests.length) {
      await db
        .insert(profileLanguages)
        .values([
          { profileId: profileAnanya.id, languageId: insertedLanguages[0].id },
          { profileId: profileAnanya.id, languageId: insertedLanguages[1].id },
        ])
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: profileAnanya.id, interestId: insertedInterests[0].id }, // Photography
          { profileId: profileAnanya.id, interestId: insertedInterests[2].id }, // Coffee
          { profileId: profileAnanya.id, interestId: insertedInterests[4].id }, // Music
        ])
        .onConflictDoNothing();
    }

    // ------------------------------------------------------------------------
    // STEP 4: DEPENDENT DOMAIN TABLES (Dating Preferences, Photos, Education)
    // ------------------------------------------------------------------------
    console.log("💘 4/5 Seeding preferences, photos, KYC, and matching...");

    if (userAarav) {
      await db
        .insert(education)
        .values({
          userId: userAarav.id,
          educationLevel: "bachelors",
          qualification: "B.Tech Computer Science",
          institutionName: "NIT Surathkal",
          profession: "Technology",
          occupation: "Senior Software Engineer",
          companyName: "Fintech Labs",
          incomeRange: "₹25L - ₹50L",
          isPrimary: true,
        })
        .onConflictDoNothing();

      await db
        .insert(datingPreferences)
        .values({
          userId: userAarav.id,
          minAge: 23,
          maxAge: 32,
          maxDistanceKm: 30,
          preferredGenders: ["female"],
          relationshipIntentions: ["long_term", "marriage"],
          verifiedOnly: false,
        })
        .onConflictDoNothing();

      await db
        .insert(profilePhotos)
        .values([
          {
            userId: userAarav.id,
            storageKey: "profiles/aarav_primary.jpg",
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
            displayOrder: 0,
            isPrimary: true,
            verificationStatus: "verified",
            moderationStatus: "approved",
            mimeType: "image/jpeg",
            fileSizeBytes: 245000,
            width: 1080,
            height: 1350,
          },
        ])
        .onConflictDoNothing();
    }

    if (userAnanya) {
      await db
        .insert(datingPreferences)
        .values({
          userId: userAnanya.id,
          minAge: 25,
          maxAge: 34,
          maxDistanceKm: 25,
          preferredGenders: ["male"],
          relationshipIntentions: ["long_term"],
          verifiedOnly: true,
        })
        .onConflictDoNothing();

      await db
        .insert(profilePhotos)
        .values([
          {
            userId: userAnanya.id,
            storageKey: "profiles/ananya_primary.jpg",
            url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
            displayOrder: 0,
            isPrimary: true,
            verificationStatus: "verified",
            moderationStatus: "approved",
            mimeType: "image/jpeg",
            fileSizeBytes: 310000,
            width: 1080,
            height: 1350,
          },
        ])
        .onConflictDoNothing();

      // KYC Record
      await db
        .insert(kycVerifications)
        .values({
          userId: userAnanya.id,
          documentType: "passport",
          documentNumberHash: "sha256_mock_hash_ananya_doc",
          status: "verified",
          provider: "hyperverge",
          providerReference: "KYC-REF-ANANYA-2026",
          verifiedAt: new Date(),
          reviewedBy: modUser ? modUser.id : null,
        })
        .onConflictDoNothing();
    }

    // ------------------------------------------------------------------------
    // STEP 5: SWIPES, MATCHES, CHAT & MONETIZATION
    // ------------------------------------------------------------------------
    console.log("💬 5/5 Seeding mutual match, conversation, and subscription...");

    if (userAarav && userAnanya) {
      // Swipes
      await db
        .insert(swipes)
        .values([
          {
            userId: userAarav.id,
            targetUserId: userAnanya.id,
            action: "like",
            source: "discovery",
          },
          {
            userId: userAnanya.id,
            targetUserId: userAarav.id,
            action: "like",
            source: "discovery",
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(swipeEvents)
        .values([
          {
            userId: userAarav.id,
            targetUserId: userAnanya.id,
            action: "like",
            source: "discovery",
          },
          {
            userId: userAnanya.id,
            targetUserId: userAarav.id,
            action: "like",
            source: "discovery",
          },
        ])
        .onConflictDoNothing();

      // Canonical match ordering (user1_id < user2_id)
      const [u1, u2] =
        userAarav.id < userAnanya.id
          ? [userAarav.id, userAnanya.id]
          : [userAnanya.id, userAarav.id];

      const [sampleMatch] = await db
        .insert(matches)
        .values({
          user1Id: u1,
          user2Id: u2,
          status: "active",
          lastActivityAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      if (sampleMatch) {
        const [chatConv] = await db
          .insert(conversations)
          .values({
            matchId: sampleMatch.id,
          })
          .onConflictDoNothing()
          .returning();

        if (chatConv) {
          await db
            .insert(conversationMembers)
            .values([
              { conversationId: chatConv.id, userId: userAarav.id },
              { conversationId: chatConv.id, userId: userAnanya.id },
            ])
            .onConflictDoNothing();

          const [msg1] = await db
            .insert(messages)
            .values({
              conversationId: chatConv.id,
              senderId: userAarav.id,
              messageType: "text",
              content:
                "Hey Ananya! Loved your photography shots. Where was that sunset photo taken?",
            })
            .onConflictDoNothing()
            .returning();

          if (msg1) {
            await db
              .insert(messageReads)
              .values({
                messageId: msg1.id,
                userId: userAnanya.id,
                readAt: new Date(),
              })
              .onConflictDoNothing();
          }

          await db
            .insert(messages)
            .values({
              conversationId: chatConv.id,
              senderId: userAnanya.id,
              messageType: "text",
              content:
                "Hi Aarav! That was at Nandi Hills last weekend early morning 😊",
            })
            .onConflictDoNothing();
        }
      }

      // Sample Subscription & Payment for Aarav
      if (planGold) {
        const [sub] = await db
          .insert(subscriptions)
          .values({
            userId: userAarav.id,
            planId: planGold.id,
            provider: "razorpay",
            providerSubscriptionId: "sub_mock_rzp_aarav_99",
            status: "active",
            autoRenew: true,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          })
          .onConflictDoNothing()
          .returning();

        if (sub) {
          await db
            .insert(payments)
            .values({
              userId: userAarav.id,
              subscriptionId: sub.id,
              provider: "razorpay",
              providerPaymentId: "pay_mock_rzp_tx_001",
              providerOrderId: "order_mock_rzp_ord_001",
              amount: "499.00",
              currency: "INR",
              status: "success",
            })
            .onConflictDoNothing();
        }
      }
    }

    console.log("\n✅ Database seeded successfully with all sample data!\n");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
