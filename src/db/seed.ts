import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
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
  userSessions,
  otpVerifications,
  passwordResetTokens,
  userLoginEvents,
  userSettings,
  notificationSettings,
  profileLanguages,
  profileInterests,
  education,
  kycVerifications,
  profilePhotos,
  mediaAssets,
  datingPreferences,
  swipes,
  swipeEvents,
  matches,
  conversations,
  conversationMembers,
  messages,
  messageReads,
  blocks,
  reports,
  reportActions,
  userSuspensions,
  adminAuditLogs,
  notifications,
  pushNotificationDeliveries,
  subscriptions,
  subscriptionEvents,
  payments,
  featureUsage,
} from "./schema";

/**
 * ============================================================================
 * COMPLETE DATABASE SEED SCRIPT (All 39 Tables in Strict Dependency Order)
 * ============================================================================
 * Populates realistic production test data across all 5 schema layers:
 * 1. Independent Master Catalogs (languages, interests, plans, features, plan_features)
 * 2. Core User Entities (users, profiles, devices, sessions, OTPs, password tokens, logins, settings)
 * 3. Junction Tables (profile_languages, profile_interests, conv_members, message_reads, plan_features)
 * 4. Dependent Tables (education, KYC, photos, media, preferences, swipes, matches, chat, safety, notifs)
 * 5. Monetization (subscriptions, payments, webhook events, feature usage quotas)
 */

async function seed() {
  console.log("🌱 Starting complete database seeding for ALL 39 tables...\n");

  try {
    // ------------------------------------------------------------------------
    // STEP 1: INDEPENDENT CATALOGS (Master Lookups with 0 Dependencies)
    // ------------------------------------------------------------------------
    console.log("📦 1/5 Seeding independent lookup tables...");

    const insertedLanguages = await db
      .insert(languages)
      .values([
        { name: "English" },
        { name: "Hindi" },
        { name: "Telugu" },
        { name: "Tamil" },
        { name: "Kannada" },
        { name: "Malayalam" },
        { name: "Marathi" },
        { name: "Bengali" },
        { name: "Gujarati" },
        { name: "Punjabi" },
        { name: "Spanish" },
        { name: "French" },
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
        { name: "Movies & Cinema", category: "Entertainment" },
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
          features: "Priority likes, message before matching, unlimited rewind, 1 free boost per week",
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

    if (planGold && featLikes && featSuperLike && featSeeWhoLiked) {
      await db
        .insert(planFeatures)
        .values([
          { planId: planGold.id, featureId: featLikes.id, limitValue: null },
          { planId: planGold.id, featureId: featSuperLike.id, limitValue: 5 },
          { planId: planGold.id, featureId: featSeeWhoLiked.id, limitValue: null },
        ])
        .onConflictDoNothing();
    }

    if (planPlatinum && featLikes && featSuperLike && featSeeWhoLiked && featBoost && featFilters) {
      await db
        .insert(planFeatures)
        .values([
          { planId: planPlatinum.id, featureId: featLikes.id, limitValue: null },
          { planId: planPlatinum.id, featureId: featSuperLike.id, limitValue: 10 },
          { planId: planPlatinum.id, featureId: featSeeWhoLiked.id, limitValue: null },
          { planId: planPlatinum.id, featureId: featBoost.id, limitValue: 4 },
          { planId: planPlatinum.id, featureId: featFilters.id, limitValue: null },
        ])
        .onConflictDoNothing();
    }

    console.log("   ✓ Independent tables & plan features seeded.");

    // ------------------------------------------------------------------------
    // STEP 2: CORE USERS, SESSIONS, DEVICES, SETTINGS & SECURITY LOGS
    // ------------------------------------------------------------------------
    console.log("👥 2/5 Seeding core users, devices, sessions, and security logs...");

    const passwordHash = await bcrypt.hash("Password@123", 10);

    const insertedUsers = await db
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
          lastActiveAt: new Date(),
        },
        {
          email: "aarav.sharma@example.com",
          phone: "+919876543212",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        // Ammu (Figma Featured Candidate: Ammu, 23, 5.6 fts, Lives in Hyderabad)
        {
          email: "ammu.reddy@example.com",
          phone: "+919876543220",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "ananya.verma@example.com",
          phone: "+919876543213",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "rohan.mehta@example.com",
          phone: "+919876543214",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "priya.nair@example.com",
          phone: "+919876543215",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "vikram.rao@example.com",
          phone: "+919876543216",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "sneha.kulkarni@example.com",
          phone: "+919876543217",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "karthik.iyer@example.com",
          phone: "+919876543218",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
        {
          email: "diya.kapoor@example.com",
          phone: "+919876543219",
          passwordHash,
          role: "user",
          status: "active",
          emailVerified: true,
          phoneVerified: true,
          lastActiveAt: new Date(),
        },
      ])
      .onConflictDoNothing()
      .returning();

    // Map inserted users by email for straightforward reference
    const userMap = new Map<string, typeof users.$inferSelect>();
    const allDbUsers = await db.select().from(users);
    for (const u of allDbUsers) {
      if (u.email) {
        userMap.set(u.email, u);
      }
    }

    const uAdmin = userMap.get("admin@datingapp.com")!;
    const uAarav = userMap.get("aarav.sharma@example.com")!;
    const uAmmu = userMap.get("ammu.reddy@example.com")!;
    const uAnanya = userMap.get("ananya.verma@example.com")!;
    const uRohan = userMap.get("rohan.mehta@example.com")!;
    const uPriya = userMap.get("priya.nair@example.com")!;
    const uVikram = userMap.get("vikram.rao@example.com")!;
    const uSneha = userMap.get("sneha.kulkarni@example.com")!;
    const uKarthik = userMap.get("karthik.iyer@example.com")!;
    const uDiya = userMap.get("diya.kapoor@example.com")!;

    const userList = [uAdmin, uAarav, uAmmu, uAnanya, uRohan, uPriya, uVikram, uSneha, uKarthik, uDiya].filter(Boolean);

    // Seed devices, sessions, login events, and user settings for all users
    const deviceMap = new Map<string, string>(); // userId -> deviceId

    for (const u of userList) {
      const email = u.email ?? "";
      const phone = u.phone ?? "";

      // User Settings
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

      // Notification Settings
      await db
        .insert(notificationSettings)
        .values({
          userId: u.id,
          newMatches: true,
          newMessages: true,
          newLikes: true,
          marketing: false,
          pushEnabled: true,
          emailEnabled: true,
        })
        .onConflictDoNothing();

      // Devices
      const [dev] = await db
        .insert(userDevices)
        .values({
          userId: u.id,
          deviceToken: `fcm_device_token_${email.split("@")[0] || "user"}_2026_xyz`,
          platform: email.includes("ammu") || email.includes("priya") ? "ios" : "android",
          appVersion: "1.0.0",
          osVersion: email.includes("ammu") || email.includes("priya") ? "iOS 18.2" : "Android 15",
          lastActiveAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();

      if (dev) {
        deviceMap.set(u.id, dev.id);
      }

      // Sessions
      await db
        .insert(userSessions)
        .values({
          userId: u.id,
          deviceId: dev?.id || null,
          refreshTokenHash: `refresh_hash_${email.split("@")[0] || "user"}_token`,
          deviceInfo: email.includes("ammu") ? "iPhone 16 Pro" : "Pixel 9 Pro",
          ipAddress: "127.0.0.1",
          userAgent: "DatingApp/1.0.0 Mobile",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastUsedAt: new Date(),
        })
        .onConflictDoNothing();

      // Login Events (Success & Failed)
      await db
        .insert(userLoginEvents)
        .values([
          {
            userId: u.id,
            email,
            success: true,
            ipAddress: "127.0.0.1",
            userAgent: "DatingApp/1.0.0 Mobile",
          },
          {
            userId: u.id,
            email,
            success: false,
            ipAddress: "127.0.0.1",
            userAgent: "DatingApp/1.0.0 Mobile",
            failureReason: "Invalid password attempt (simulated security audit)",
          },
        ])
        .onConflictDoNothing();

      // OTP Verifications
      await db
        .insert(otpVerifications)
        .values({
          userId: u.id,
          identifier: phone || email,
          purpose: "phone_verification",
          codeHash: `sha256_mock_otp_${email.split("@")[0] || "user"}`,
          attempts: 1,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          verifiedAt: new Date(),
        })
        .onConflictDoNothing();

      // Password Reset Tokens
      await db
        .insert(passwordResetTokens)
        .values({
          userId: u.id,
          tokenHash: `reset_token_hash_${email.split("@")[0] || "user"}_mock`,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();
    }

    console.log("   ✓ Core users, devices, sessions, settings, and OTP tables seeded.");

    // ------------------------------------------------------------------------
    // STEP 3: PROFILES (Detailed Personas with Figma Matches Screen Profiles)
    // ------------------------------------------------------------------------
    console.log("👤 3/5 Seeding profiles, photos, education, media, and KYC...");

    const profileData = [
      // Admin
      {
        userId: uAdmin.id,
        name: "System Admin",
        dateOfBirth: "1990-01-01",
        gender: "other",
        religion: "Open to all",
        heightCm: 175,
        bio: "Platform Administrator & Trust & Safety Moderator.",
        relationshipStatus: "Single",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        latitude: 12.9716,
        longitude: 77.5946,
      },
      // Aarav Sharma
      {
        userId: uAarav.id,
        name: "Aarav Sharma",
        dateOfBirth: "1997-04-15",
        gender: "male",
        religion: "Hindu",
        heightCm: 180,
        bio: "Software Architect & Weekend trekker. Searching for good conversations, indie music, and great filter coffee ☕",
        relationshipStatus: "Single",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        latitude: 12.9716,
        longitude: 77.5946,
      },
      // AMMU (Exact Figma Profile Card: Ammu, 23, 5.6 fts, Lives in Hyderabad)
      {
        userId: uAmmu.id,
        name: "Ammu",
        dateOfBirth: "2003-02-14",
        gender: "female",
        religion: "Hindu",
        heightCm: 168, // 168 cm = 5.6 fts
        bio: "Looking for good vibes, genuine conversations, and a real connection. Let's explore cozy cafes and talk about art ✨",
        relationshipStatus: "Single",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        latitude: 17.385,
        longitude: 78.4867,
      },
      // Ananya Verma
      {
        userId: uAnanya.id,
        name: "Ananya Verma",
        dateOfBirth: "1998-08-22",
        gender: "female",
        religion: "Hindu",
        heightCm: 165,
        bio: "UI/UX Designer. Obsessed with indie cinema, matcha lattes, and rooftop sunsets 🌅",
        relationshipStatus: "Single",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        latitude: 12.9784,
        longitude: 77.6408,
      },
      // Rohan Mehta
      {
        userId: uRohan.id,
        name: "Rohan Mehta",
        dateOfBirth: "1995-11-03",
        gender: "male",
        religion: "Jain",
        heightCm: 175,
        bio: "Product Manager in Fintech. Love marathon running, podcasts, and discovering hidden cocktail bars 🍸",
        relationshipStatus: "Single",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        latitude: 19.076,
        longitude: 72.8777,
      },
      // Priya Nair
      {
        userId: uPriya.id,
        name: "Priya Nair",
        dateOfBirth: "1999-01-19",
        gender: "female",
        religion: "Hindu",
        heightCm: 168,
        bio: "Architectural photographer. Dog mom to a golden retriever named Bruno 🐾",
        relationshipStatus: "Single",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        latitude: 17.4065,
        longitude: 78.4772,
      },
      // Vikram Rao
      {
        userId: uVikram.id,
        name: "Vikram Rao",
        dateOfBirth: "1996-06-10",
        gender: "male",
        religion: "Hindu",
        heightCm: 183,
        bio: "Data Scientist & AI Researcher. Passionate about guitar, board games, and sci-fi books 🚀",
        relationshipStatus: "Single",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        latitude: 17.4485,
        longitude: 78.3748,
      },
      // Sneha Kulkarni
      {
        userId: uSneha.id,
        name: "Sneha Kulkarni",
        dateOfBirth: "2000-09-05",
        gender: "female",
        religion: "Hindu",
        heightCm: 162,
        bio: "Content strategist & potter. Plant parent and weekend baker 🥐",
        relationshipStatus: "Single",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        latitude: 18.5204,
        longitude: 73.8567,
      },
      // Karthik Iyer
      {
        userId: uKarthik.id,
        name: "Karthik Iyer",
        dateOfBirth: "1994-12-30",
        gender: "male",
        religion: "Hindu",
        heightCm: 178,
        bio: "Investment Banker & Amateur Chef. Love classical fusion music, tennis, and culinary adventures 🍷",
        relationshipStatus: "Single",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        latitude: 13.0827,
        longitude: 80.2707,
      },
      // Diya Kapoor
      {
        userId: uDiya.id,
        name: "Diya Kapoor",
        dateOfBirth: "2002-03-18",
        gender: "female",
        religion: "Sikh",
        heightCm: 170,
        bio: "Fashion Stylist & Travel Enthusiast. Always planning my next trip to the mountains 🏔️",
        relationshipStatus: "Single",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        latitude: 28.6139,
        longitude: 77.209,
      },
    ];

    for (const p of profileData) {
      await db.insert(profiles).values(p).onConflictDoNothing();
    }

    const allDbProfiles = await db.select().from(profiles);
    const profileMap = new Map<string, typeof profiles.$inferSelect>();
    for (const p of allDbProfiles) {
      profileMap.set(p.userId, p);
    }

    // ------------------------------------------------------------------------
    // STEP 4: EDUCATION, KYC, PHOTOS, MEDIA, PREFERENCES & PROFILE JUNCTIONS
    // ------------------------------------------------------------------------

    // 1. Education & Career Backgrounds
    const educationData = [
      {
        userId: uAmmu.id,
        educationLevel: "Bachelors",
        qualification: "B.Tech",
        institutionName: "JNTU Hyderabad",
        profession: "Designer",
        occupation: "Lead UI/UX Designer",
        companyName: "Creative Studios",
        incomeRange: "₹10–20 Lakh",
        isPrimary: true,
      },
      {
        userId: uAarav.id,
        educationLevel: "Bachelors",
        qualification: "B.Tech / B.E",
        institutionName: "NIT Surathkal",
        profession: "Software Engineer",
        occupation: "Software Architect",
        companyName: "Fintech Labs",
        incomeRange: "₹20 Lakh+",
        isPrimary: true,
      },
      {
        userId: uAnanya.id,
        educationLevel: "Masters",
        qualification: "MBA",
        institutionName: "IIM Bangalore",
        profession: "Marketing",
        occupation: "Senior Brand Specialist",
        companyName: "BrandWorks",
        incomeRange: "₹10–20 Lakh",
        isPrimary: true,
      },
      {
        userId: uRohan.id,
        educationLevel: "Bachelors",
        qualification: "B.E",
        institutionName: "VJTI Mumbai",
        profession: "Product Manager",
        occupation: "Principal PM",
        companyName: "FinScale",
        incomeRange: "₹20 Lakh+",
        isPrimary: true,
      },
      {
        userId: uPriya.id,
        educationLevel: "Bachelors",
        qualification: "B.Arch",
        institutionName: "SPA New Delhi",
        profession: "Architect",
        occupation: "Design Architect",
        companyName: "Design Build",
        incomeRange: "₹5–10 Lakh",
        isPrimary: true,
      },
      {
        userId: uVikram.id,
        educationLevel: "Masters",
        qualification: "M.S in Data Science",
        institutionName: "IIT Hyderabad",
        profession: "Data Scientist",
        occupation: "Staff Research Engineer",
        companyName: "AI Labs",
        incomeRange: "₹20 Lakh+",
        isPrimary: true,
      },
      {
        userId: uSneha.id,
        educationLevel: "Bachelors",
        qualification: "B.A in Journalism",
        institutionName: "Pune University",
        profession: "Content Strategist",
        occupation: "Media Specialist",
        companyName: "MediaHub",
        incomeRange: "₹5–10 Lakh",
        isPrimary: true,
      },
      {
        userId: uKarthik.id,
        educationLevel: "Masters",
        qualification: "CA / CFA",
        institutionName: "ICAI",
        profession: "Investment Banker",
        occupation: "Vice President",
        companyName: "Goldman Capital",
        incomeRange: "₹20 Lakh+",
        isPrimary: true,
      },
      {
        userId: uDiya.id,
        educationLevel: "Bachelors",
        qualification: "B.Des in Fashion Design",
        institutionName: "NIFT New Delhi",
        profession: "Fashion Stylist",
        occupation: "Editorial Stylist",
        companyName: "Vogue India Contributor",
        incomeRange: "₹10–20 Lakh",
        isPrimary: true,
      },
    ];

    for (const edu of educationData) {
      await db.insert(education).values(edu).onConflictDoNothing();
    }

    // 2. KYC Verifications (Testing different Trust Score Badges: 100%, 75%, 50%, 25%)
    const kycData = [
      {
        userId: uAmmu.id, // Gives 100% Trust Score Badge 🟢 (Exact Figma Screen)
        documentType: "aadhaar",
        documentNumberHash: "sha256_mock_ammu_aadhaar_verified",
        status: "verified",
        provider: "hyperverge",
        providerReference: "KYC-AMMU-HYD-2026-01",
        verifiedAt: new Date(),
      },
      {
        userId: uAarav.id, // 100% Trust Score
        documentType: "passport",
        documentNumberHash: "sha256_mock_aarav_passport_verified",
        status: "verified",
        provider: "digilocker",
        providerReference: "KYC-AARAV-BLR-2026-02",
        verifiedAt: new Date(),
      },
      {
        userId: uVikram.id, // 100% Trust Score
        documentType: "aadhaar",
        documentNumberHash: "sha256_mock_vikram_aadhaar_verified",
        status: "verified",
        provider: "hyperverge",
        providerReference: "KYC-VIKRAM-HYD-2026-03",
        verifiedAt: new Date(),
      },
      {
        userId: uPriya.id, // 100% Trust Score
        documentType: "driving_license",
        documentNumberHash: "sha256_mock_priya_dl_verified",
        status: "verified",
        provider: "hyperverge",
        providerReference: "KYC-PRIYA-HYD-2026-04",
        verifiedAt: new Date(),
      },
      {
        userId: uKarthik.id, // 100% Trust Score
        documentType: "passport",
        documentNumberHash: "sha256_mock_karthik_passport_verified",
        status: "verified",
        provider: "digilocker",
        providerReference: "KYC-KARTHIK-MAA-2026-05",
        verifiedAt: new Date(),
      },
      {
        userId: uDiya.id, // 100% Trust Score
        documentType: "aadhaar",
        documentNumberHash: "sha256_mock_diya_aadhaar_verified",
        status: "verified",
        provider: "hyperverge",
        providerReference: "KYC-DIYA-DEL-2026-06",
        verifiedAt: new Date(),
      },
      {
        userId: uAnanya.id, // 75% Trust Score (KYC submitted / pending)
        documentType: "aadhaar",
        documentNumberHash: "sha256_mock_ananya_aadhaar_pending",
        status: "pending",
        provider: "hyperverge",
        providerReference: "KYC-ANANYA-BLR-2026-07",
      },
      {
        userId: uRohan.id, // 50% Trust Score (KYC rejected / re-upload requested)
        documentType: "driving_license",
        documentNumberHash: "sha256_mock_rohan_dl_rejected",
        status: "rejected",
        rejectionReason: "Document image blurred. Please re-upload clear photo ID.",
        provider: "hyperverge",
        providerReference: "KYC-ROHAN-BOM-2026-08",
      },
    ];

    for (const kyc of kycData) {
      await db.insert(kycVerifications).values(kyc).onConflictDoNothing();
    }

    // 3. Profile Photos (High quality Unsplash portrait photography)
    const photosData = [
      // Ammu (Figma Screen main portrait + gallery)
      {
        userId: uAmmu.id,
        storageKey: "profiles/ammu_main.jpg",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 320000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      {
        userId: uAmmu.id,
        storageKey: "profiles/ammu_2.jpg",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
        displayOrder: 2,
        isPrimary: false,
        mimeType: "image/jpeg",
        fileSizeBytes: 290000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Aarav
      {
        userId: uAarav.id,
        storageKey: "profiles/aarav_primary.jpg",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 245000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      {
        userId: uAarav.id,
        storageKey: "profiles/aarav_2.jpg",
        url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
        displayOrder: 2,
        isPrimary: false,
        mimeType: "image/jpeg",
        fileSizeBytes: 280000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Ananya
      {
        userId: uAnanya.id,
        storageKey: "profiles/ananya_primary.jpg",
        url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 310000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Rohan
      {
        userId: uRohan.id,
        storageKey: "profiles/rohan_primary.jpg",
        url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 260000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Priya
      {
        userId: uPriya.id,
        storageKey: "profiles/priya_primary.jpg",
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 280000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Vikram
      {
        userId: uVikram.id,
        storageKey: "profiles/vikram_primary.jpg",
        url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 275000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Sneha
      {
        userId: uSneha.id,
        storageKey: "profiles/sneha_primary.jpg",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 250000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Karthik
      {
        userId: uKarthik.id,
        storageKey: "profiles/karthik_primary.jpg",
        url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 295000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
      // Diya
      {
        userId: uDiya.id,
        storageKey: "profiles/diya_primary.jpg",
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
        displayOrder: 1,
        isPrimary: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 330000,
        verificationStatus: "verified",
        moderationStatus: "approved",
      },
    ];

    for (const photo of photosData) {
      await db.insert(profilePhotos).values(photo).onConflictDoNothing();
    }

    // 4. Media Assets (Central Media Repository: Photos, Audio Intros, Clips)
    const mediaData = [
      {
        userId: uAmmu.id,
        storageKey: "profiles/ammu_main.jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
        fileSizeBytes: 320000,
        width: 1080,
        height: 1350,
        status: "ready",
      },
      {
        userId: uAmmu.id,
        storageKey: "audio/ammu_voice_prompt.m4a",
        mediaType: "audio",
        mimeType: "audio/mp4",
        fileSizeBytes: 450000,
        durationSeconds: 15,
        status: "ready",
      },
      {
        userId: uAarav.id,
        storageKey: "profiles/aarav_primary.jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
        fileSizeBytes: 245000,
        width: 1080,
        height: 1350,
        status: "ready",
      },
      {
        userId: uVikram.id,
        storageKey: "profiles/vikram_primary.jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
        fileSizeBytes: 275000,
        width: 1080,
        height: 1350,
        status: "ready",
      },
    ];

    for (const media of mediaData) {
      await db.insert(mediaAssets).values(media).onConflictDoNothing();
    }

    // 5. Dating Preferences (Discovery & Algorithm Filtering)
    for (const u of userList) {
      const isFemale = [uAmmu.id, uAnanya.id, uPriya.id, uSneha.id, uDiya.id].includes(u.id);
      await db
        .insert(datingPreferences)
        .values({
          userId: u.id,
          minAge: 21,
          maxAge: 35,
          maxDistanceKm: 50,
          preferredGenders: isFemale ? ["male"] : ["female"],
          preferredInterestIds: [1, 2, 3, 4, 5],
          relationshipIntentions: ["long_term", "dating"],
          religionPreferences: ["Hindu", "Open to all"],
          verifiedOnly: false,
        })
        .onConflictDoNothing();
    }

    // 6. Profile Languages & Interests Junctions
    const dbLanguages = await db.select().from(languages);
    const dbInterests = await db.select().from(interests);

    const langEng = dbLanguages.find((l) => l.name === "English")?.id || 1;
    const langHin = dbLanguages.find((l) => l.name === "Hindi")?.id || 2;
    const langTel = dbLanguages.find((l) => l.name === "Telugu")?.id || 3;
    const langTam = dbLanguages.find((l) => l.name === "Tamil")?.id || 4;
    const langMar = dbLanguages.find((l) => l.name === "Marathi")?.id || 7;

    const intPhoto = dbInterests.find((i) => i.name === "Photography")?.id || 1;
    const intHike = dbInterests.find((i) => i.name === "Hiking & Outdoors")?.id || 2;
    const intCoffee = dbInterests.find((i) => i.name === "Coffee & Cafes")?.id || 3;
    const intFood = dbInterests.find((i) => i.name === "Cooking & Foodie")?.id || 4;
    const intMusic = dbInterests.find((i) => i.name === "Live Music & Concerts")?.id || 5;
    const intGym = dbInterests.find((i) => i.name === "Fitness & Gym")?.id || 6;
    const intTech = dbInterests.find((i) => i.name === "Tech & Coding")?.id || 8;
    const intTravel = dbInterests.find((i) => i.name === "Travel & Backpacking")?.id || 9;

    // Ammu Profile Languages & Interests
    const pAmmu = profileMap.get(uAmmu.id);
    if (pAmmu) {
      await db
        .insert(profileLanguages)
        .values({
          profileId: pAmmu.id,
          languageIds: [langEng, langTel, langHin],
        })
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: pAmmu.id, interestId: intPhoto },
          { profileId: pAmmu.id, interestId: intMusic },
          { profileId: pAmmu.id, interestId: intTravel },
          { profileId: pAmmu.id, interestId: intCoffee },
        ])
        .onConflictDoNothing();
    }

    // Aarav Profile Languages & Interests
    const pAarav = profileMap.get(uAarav.id);
    if (pAarav) {
      await db
        .insert(profileLanguages)
        .values({
          profileId: pAarav.id,
          languageIds: [langEng, langHin],
        })
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: pAarav.id, interestId: intTech },
          { profileId: pAarav.id, interestId: intHike },
          { profileId: pAarav.id, interestId: intCoffee },
        ])
        .onConflictDoNothing();
    }

    // Ananya Profile Languages & Interests
    const pAnanya = profileMap.get(uAnanya.id);
    if (pAnanya) {
      await db
        .insert(profileLanguages)
        .values({
          profileId: pAnanya.id,
          languageIds: [langEng, langHin],
        })
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: pAnanya.id, interestId: intCoffee },
          { profileId: pAnanya.id, interestId: intMusic },
          { profileId: pAnanya.id, interestId: intTravel },
        ])
        .onConflictDoNothing();
    }

    // Vikram Profile Languages & Interests
    const pVikram = profileMap.get(uVikram.id);
    if (pVikram) {
      await db
        .insert(profileLanguages)
        .values({
          profileId: pVikram.id,
          languageIds: [langEng, langTel, langHin],
        })
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: pVikram.id, interestId: intTech },
          { profileId: pVikram.id, interestId: intMusic },
          { profileId: pVikram.id, interestId: intGym },
        ])
        .onConflictDoNothing();
    }

    // Priya Profile Languages & Interests
    const pPriya = profileMap.get(uPriya.id);
    if (pPriya) {
      await db
        .insert(profileLanguages)
        .values({
          profileId: pPriya.id,
          languageIds: [langEng, langTel, langTam],
        })
        .onConflictDoNothing();

      await db
        .insert(profileInterests)
        .values([
          { profileId: pPriya.id, interestId: intPhoto },
          { profileId: pPriya.id, interestId: intTravel },
          { profileId: pPriya.id, interestId: intFood },
        ])
        .onConflictDoNothing();
    }

    console.log("   ✓ Profiles, photos, education, media, KYC, and preferences seeded.");

    // ------------------------------------------------------------------------
    // STEP 5: MATCHING, CHAT, SAFETY, NOTIFICATIONS & MONETIZATION
    // ------------------------------------------------------------------------
    console.log("💘 5/5 Seeding matches, chat conversations, safety, notifications, and payments...");

    // Helper for canonical pair ordering
    const getCanonicalPair = (id1: string, id2: string) =>
      id1 < id2 ? [id1, id2] : [id2, id1];

    // Swipes:
    // 1. Aarav & Ammu -> Mutual Like -> Match
    // 2. Aarav & Ananya -> Mutual Like -> Match
    // 3. Vikram & Ammu -> Mutual Like -> Match
    // 4. Karthik & Priya -> Mutual Like -> Match
    // 5. Rohan & Priya -> Rohan like, Priya pass
    // 6. Vikram & Ananya -> Vikram super_like
    const swipePairs = [
      { userId: uAarav.id, targetUserId: uAmmu.id, action: "like", source: "discovery" },
      { userId: uAmmu.id, targetUserId: uAarav.id, action: "like", source: "discovery" },
      { userId: uAarav.id, targetUserId: uAnanya.id, action: "like", source: "discovery" },
      { userId: uAnanya.id, targetUserId: uAarav.id, action: "like", source: "discovery" },
      { userId: uVikram.id, targetUserId: uAmmu.id, action: "like", source: "discovery" },
      { userId: uAmmu.id, targetUserId: uVikram.id, action: "like", source: "discovery" },
      { userId: uKarthik.id, targetUserId: uPriya.id, action: "like", source: "discovery" },
      { userId: uPriya.id, targetUserId: uKarthik.id, action: "like", source: "discovery" },
      { userId: uRohan.id, targetUserId: uPriya.id, action: "like", source: "discovery" },
      { userId: uPriya.id, targetUserId: uRohan.id, action: "reject", source: "discovery" },
      { userId: uVikram.id, targetUserId: uAnanya.id, action: "super_like", source: "discovery" },
      { userId: uKarthik.id, targetUserId: uAmmu.id, action: "super_like", source: "discovery" },
    ];

    for (const sw of swipePairs) {
      await db.insert(swipes).values(sw).onConflictDoNothing();
      await db.insert(swipeEvents).values(sw).onConflictDoNothing();
    }

    // Matches:
    // Pair 1: Aarav & Ammu
    const [u1AaravAmmu, u2AaravAmmu] = getCanonicalPair(uAarav.id, uAmmu.id);
    const [matchAaravAmmu] = await db
      .insert(matches)
      .values({
        user1Id: u1AaravAmmu,
        user2Id: u2AaravAmmu,
        status: "active",
        lastActivityAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    // Pair 2: Aarav & Ananya
    const [u1AaravAnanya, u2AaravAnanya] = getCanonicalPair(uAarav.id, uAnanya.id);
    const [matchAaravAnanya] = await db
      .insert(matches)
      .values({
        user1Id: u1AaravAnanya,
        user2Id: u2AaravAnanya,
        status: "active",
        lastActivityAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    // Pair 3: Vikram & Ammu
    const [u1VikramAmmu, u2VikramAmmu] = getCanonicalPair(uVikram.id, uAmmu.id);
    const [matchVikramAmmu] = await db
      .insert(matches)
      .values({
        user1Id: u1VikramAmmu,
        user2Id: u2VikramAmmu,
        status: "active",
        lastActivityAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    // Pair 4: Karthik & Priya
    const [u1KarthikPriya, u2KarthikPriya] = getCanonicalPair(uKarthik.id, uPriya.id);
    await db
      .insert(matches)
      .values({
        user1Id: u1KarthikPriya,
        user2Id: u2KarthikPriya,
        status: "active",
        lastActivityAt: new Date(),
      })
      .onConflictDoNothing();

    // Conversations & Messages:
    // Chat 1: Aarav & Ammu (Active multi-turn conversation)
    if (matchAaravAmmu) {
      const [convAaravAmmu] = await db
        .insert(conversations)
        .values({ matchId: matchAaravAmmu.id })
        .onConflictDoNothing()
        .returning();

      if (convAaravAmmu) {
        await db
          .insert(conversationMembers)
          .values([
            { conversationId: convAaravAmmu.id, userId: uAarav.id },
            { conversationId: convAaravAmmu.id, userId: uAmmu.id },
          ])
          .onConflictDoNothing();

        const [msg1] = await db
          .insert(messages)
          .values({
            conversationId: convAaravAmmu.id,
            senderId: uAarav.id,
            messageType: "text",
            content: "Hey Ammu! Loved your design portfolio & vibe ✨ How is Hyderabad treating you?",
          })
          .onConflictDoNothing()
          .returning();

        const [msg2] = await db
          .insert(messages)
          .values({
            conversationId: convAaravAmmu.id,
            senderId: uAmmu.id,
            messageType: "text",
            content: "Hey Aarav! Hyderabad has been amazing 😊 Exploring Jubilee Hills cafes this weekend. How about you?",
          })
          .onConflictDoNothing()
          .returning();

        if (msg1) {
          await db
            .insert(messageReads)
            .values({ messageId: msg1.id, userId: uAmmu.id, readAt: new Date() })
            .onConflictDoNothing();
        }
        if (msg2) {
          await db
            .insert(messageReads)
            .values({ messageId: msg2.id, userId: uAarav.id, readAt: new Date() })
            .onConflictDoNothing();
        }
      }
    }

    // Chat 2: Aarav & Ananya
    if (matchAaravAnanya) {
      const [convAaravAnanya] = await db
        .insert(conversations)
        .values({ matchId: matchAaravAnanya.id })
        .onConflictDoNothing()
        .returning();

      if (convAaravAnanya) {
        await db
          .insert(conversationMembers)
          .values([
            { conversationId: convAaravAnanya.id, userId: uAarav.id },
            { conversationId: convAaravAnanya.id, userId: uAnanya.id },
          ])
          .onConflictDoNothing();

        const [msg1] = await db
          .insert(messages)
          .values({
            conversationId: convAaravAnanya.id,
            senderId: uAarav.id,
            messageType: "text",
            content: "Hey Ananya! Loved your photography shots 😊",
          })
          .onConflictDoNothing()
          .returning();

        if (msg1) {
          await db
            .insert(messageReads)
            .values({ messageId: msg1.id, userId: uAnanya.id, readAt: new Date() })
            .onConflictDoNothing();
        }
      }
    }

    // Safety: Blocks, Reports, Moderator Report Actions, User Suspensions & Admin Audit Logs
    await db
      .insert(blocks)
      .values([
        { userId: uRohan.id, blockedUserId: uPriya.id },
        { userId: uPriya.id, blockedUserId: uRohan.id },
      ])
      .onConflictDoNothing();

    const [sampleReport] = await db
      .insert(reports)
      .values({
        reporterId: uRohan.id,
        reportedUserId: uPriya.id,
        reason: "spam",
        description: "Safety moderation review test case",
        status: "reviewed",
        resolvedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (sampleReport) {
      await db
        .insert(reportActions)
        .values({
          reportId: sampleReport.id,
          moderatorId: uAdmin.id,
          action: "dismiss",
          reason: "Verified authentic profile, no violation of terms found.",
        })
        .onConflictDoNothing();
    }

    await db
      .insert(userSuspensions)
      .values({
        userId: uRohan.id,
        type: "temporary",
        reason: "Simulated safety suspension for test suite validation",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: uAdmin.id,
      })
      .onConflictDoNothing();

    await db
      .insert(adminAuditLogs)
      .values([
        {
          adminId: uAdmin.id,
          action: "REPORT_REVIEWED",
          entityType: "report",
          entityId: sampleReport?.id || null,
          ipAddress: "127.0.0.1",
        },
        {
          adminId: uAdmin.id,
          action: "USER_KYC_APPROVED",
          entityType: "user",
          entityId: uAmmu.id,
          ipAddress: "127.0.0.1",
        },
      ])
      .onConflictDoNothing();

    // In-App Notifications & Push Notification Deliveries
    const notifData = [
      {
        userId: uAmmu.id,
        type: "new_like",
        title: "You got a new like!",
        message: "Someone in Hyderabad liked your profile. Check your Likes tab!",
        data: { screen: "LikesTab" },
      },
      {
        userId: uAmmu.id,
        type: "new_match",
        title: "It's a Match! 🎉",
        message: "You and Aarav liked each other. Say hello!",
        data: { screen: "MatchesTab", matchId: matchAaravAmmu?.id },
      },
      {
        userId: uAarav.id,
        type: "new_match",
        title: "It's a Match! 🎉",
        message: "You and Ammu liked each other!",
        data: { screen: "MatchesTab", matchId: matchAaravAmmu?.id },
      },
      {
        userId: uAarav.id,
        type: "new_message",
        title: "Ammu sent you a message",
        message: "Hey Aarav! Hyderabad has been amazing 😊...",
        data: { screen: "ChatRoom", matchId: matchAaravAmmu?.id },
      },
    ];

    for (const notif of notifData) {
      const [insertedNotif] = await db
        .insert(notifications)
        .values(notif)
        .onConflictDoNothing()
        .returning();

      const userDevId = deviceMap.get(notif.userId);
      if (insertedNotif && userDevId) {
        await db
          .insert(pushNotificationDeliveries)
          .values({
            notificationId: insertedNotif.id,
            deviceId: userDevId,
            provider: "fcm",
            providerMessageId: `fcm_msg_id_${insertedNotif.id.slice(0, 8)}`,
            status: "delivered",
            sentAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    // Monetization: Subscriptions, Payments, Webhook Events & Feature Usage
    // Aarav has Gold Plan
    if (planGold && featSuperLike && featBoost) {
      const [subAarav] = await db
        .insert(subscriptions)
        .values({
          userId: uAarav.id,
          planId: planGold.id,
          provider: "razorpay",
          providerSubscriptionId: "sub_rzp_aarav_gold_001",
          status: "active",
          autoRenew: true,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing()
        .returning();

      if (subAarav) {
        await db
          .insert(payments)
          .values({
            userId: uAarav.id,
            subscriptionId: subAarav.id,
            provider: "razorpay",
            providerPaymentId: "pay_rzp_aarav_tx_001",
            providerOrderId: "order_rzp_aarav_ord_001",
            amount: "499.00",
            currency: "INR",
            status: "success",
          })
          .onConflictDoNothing();
      }

      await db
        .insert(subscriptionEvents)
        .values({
          provider: "razorpay",
          eventId: "evt_rzp_webhook_sub_charged_001",
          eventType: "subscription.charged",
          payload: { status: "success", amount: 49900, currency: "INR" },
          status: "processed",
          processedAt: new Date(),
        })
        .onConflictDoNothing();

      // Feature Usage for Aarav (e.g. 2 Super Likes used today)
      await db
        .insert(featureUsage)
        .values({
          userId: uAarav.id,
          featureId: featSuperLike.id,
          usageDate: new Date().toISOString().split("T")[0],
          usageCount: 2,
        })
        .onConflictDoNothing();
    }

    // Karthik has Platinum Plan
    if (planPlatinum && featSuperLike && featBoost) {
      const [subKarthik] = await db
        .insert(subscriptions)
        .values({
          userId: uKarthik.id,
          planId: planPlatinum.id,
          provider: "razorpay",
          providerSubscriptionId: "sub_rzp_karthik_plat_002",
          status: "active",
          autoRenew: true,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing()
        .returning();

      if (subKarthik) {
        await db
          .insert(payments)
          .values({
            userId: uKarthik.id,
            subscriptionId: subKarthik.id,
            provider: "razorpay",
            providerPaymentId: "pay_rzp_karthik_tx_002",
            providerOrderId: "order_rzp_karthik_ord_002",
            amount: "999.00",
            currency: "INR",
            status: "success",
          })
          .onConflictDoNothing();
      }

      await db
        .insert(featureUsage)
        .values({
          userId: uKarthik.id,
          featureId: featBoost.id,
          usageDate: new Date().toISOString().split("T")[0],
          usageCount: 1,
        })
        .onConflictDoNothing();
    }

    console.log("\n============================================================");
    console.log("✅ ALL 39 DATABASE TABLES POPULATED & SEEDED SUCCESSFULLY!");
    console.log("============================================================\n");
  } catch (err) {
    console.error("❌ Seeding failed with error:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
