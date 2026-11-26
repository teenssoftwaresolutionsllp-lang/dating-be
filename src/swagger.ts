const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Dating App API",
    version: "1.0.0",
    description: "Complete API documentation for the Dating App backend",
  },
  servers: [
    {
      url: "/",
      description: "Current environment (relative)",
    },
    {
      url: "https://dating-be-p9nx.onrender.com",
      description: "Render Production server",
    },
    {
      url: "http://localhost:5000",
      description: "Local development server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Authentication, OTP, and session management" },
    { name: "Account", description: "Account deactivation and deletion" },
    { name: "Profile", description: "User profile, onboarding, KYC, and photos" },
    { name: "Location", description: "Location search and user location management" },
    { name: "Match", description: "Discovery feed, swiping, matches, likes, and safety" },
    { name: "Messages", description: "Messaging and conversation management" },
    { name: "Calls", description: "Agora RTC video/audio call management" },
    { name: "Users", description: "User device and push notification management" },
  ],
  paths: {
    // ===================== AUTH =====================
    "/api/v1/auth/send-otp": {
      post: {
        tags: ["Auth"],
        summary: "Send a 4-digit OTP to a mobile number",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone"],
                properties: {
                  phone: { type: "string", example: "9876543210", description: "10-digit mobile number without country code" },
                  countryCode: { type: "string", example: "+91", default: "+91" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OTP sent successfully" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/v1/auth/resend-otp": {
      post: {
        tags: ["Auth"],
        summary: "Resend OTP (30-second cooldown enforced)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone"],
                properties: {
                  phone: { type: "string", example: "9876543210", description: "10-digit mobile number without country code" },
                  countryCode: { type: "string", example: "+91", default: "+91" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OTP resent successfully" },
          429: { description: "Too many requests - cooldown active" },
        },
      },
    },
    "/api/v1/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP and receive JWT tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "otp"],
                properties: {
                  phone: { type: "string", example: "9876543210", description: "10-digit mobile number without country code" },
                  countryCode: { type: "string", example: "+91", default: "+91" },
                  otp: { type: "string", example: "1234" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP verified - tokens returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                        refreshToken: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid or expired OTP" },
        },
      },
    },
    "/api/v1/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Get a new access token using refresh token",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  refreshToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "New access token issued" },
          401: { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout - revoke current session",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Logged out successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/auth/language": {
      post: {
        tags: ["Auth"],
        summary: "Set preferred display language",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["language"],
                properties: {
                  language: { type: "string", example: "en" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Language preference updated" },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ===================== ACCOUNT =====================
    "/api/v1/account/deactivate": {
      post: {
        tags: ["Account"],
        summary: "Deactivate account (scheduled for deletion in 30 days)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Account deactivated successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/account/deletion-otp": {
      post: {
        tags: ["Account"],
        summary: "Request OTP for permanent account deletion",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Deletion OTP sent to registered phone" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/account/delete": {
      post: {
        tags: ["Account"],
        summary: "Confirm and permanently delete account using OTP",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["otp"],
                properties: {
                  otp: { type: "string", example: "1234" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Account permanently deleted" },
          202: { description: "Account deleted, media cleanup pending" },
          400: { description: "Invalid OTP" },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ===================== PROFILE =====================
    "/api/v1/profile/onboarding/status": {
      get: {
        tags: ["Profile"],
        summary: "Get onboarding progress status",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Onboarding status returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/me": {
      get: {
        tags: ["Profile"],
        summary: "Get the authenticated user's core profile fields",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Profile returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/my-profile": {
      get: {
        tags: ["Profile"],
        summary: "Get all saved onboarding data for the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Full profile returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/update-profile": {
      patch: {
        tags: ["Profile"],
        summary: "Create or update core profile fields",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "John Doe" },
                  dateOfBirth: { type: "string", format: "date", example: "1995-06-15" },
                  gender: { type: "string", example: "male" },
                  heightCm: { type: "number", example: 175 },
                  religion: { type: "string", example: "Hindu" },
                  relationshipStatus: { type: "string", example: "Single" },
                  foodPreference: { type: "string", example: "Vegetarian" },
                  drinking: { type: "string", example: "Socially" },
                  smoking: { type: "string", example: "No" },
                  vibes: { type: "array", items: { type: "string" } },
                  bio: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  country: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Profile updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/languages": {
      get: {
        tags: ["Profile"],
        summary: "Get list of available languages for onboarding",
        responses: { 200: { description: "Languages list returned" } },
      },
      patch: {
        tags: ["Profile"],
        summary: "Replace the authenticated user's language selection",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["languageIds"],
                properties: {
                  languageIds: { type: "array", items: { type: "number" }, example: [1, 2] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Languages updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/interests": {
      get: {
        tags: ["Profile"],
        summary: "Get list of available interests for onboarding",
        responses: { 200: { description: "Interests list returned" } },
      },
      put: {
        tags: ["Profile"],
        summary: "Replace the authenticated user's interest selection",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["interestIds"],
                properties: {
                  interestIds: { type: "array", items: { type: "number" }, example: [1, 2, 3] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Interests updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/education": {
      patch: {
        tags: ["Profile"],
        summary: "Create or update education, profession, and income info",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  educationLevel: { type: "string", example: "Bachelors" },
                  qualification: { type: "string", example: "B.Tech" },
                  profession: { type: "string", example: "Software Engineer" },
                  occupation: { type: "string", example: "Software Engineer" },
                  companyName: { type: "string", example: "Acme Corp" },
                  incomeRange: { type: "string", example: "10-15 LPA" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Education updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/kyc/verify-document": {
      post: {
        tags: ["Profile"],
        summary: "Pre-validate Government ID document photo in real-time",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["documentPhoto"],
                properties: {
                  documentPhoto: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Document validated" },
          400: { description: "Invalid document" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/kyc/verify-selfie": {
      post: {
        tags: ["Profile"],
        summary: "Pre-validate live selfie photo in real-time",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["selfiePhoto"],
                properties: {
                  selfiePhoto: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Selfie validated" },
          400: { description: "Invalid selfie" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/kyc": {
      post: {
        tags: ["Profile"],
        summary: "Submit KYC with document and selfie photos",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["documentPhoto", "selfiePhoto"],
                properties: {
                  documentPhoto: { type: "string", format: "binary" },
                  selfiePhoto: { type: "string", format: "binary" },
                  documentType: { type: "string", example: "aadhar" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "KYC submitted successfully" },
          400: { description: "Validation failed" },
          401: { description: "Unauthorized" },
        },
      },
      get: {
        tags: ["Profile"],
        summary: "Get the authenticated user's KYC status",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "KYC status returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/photos/validate-photo": {
      post: {
        tags: ["Profile"],
        summary: "Pre-validate a single profile photo",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["photo"],
                properties: {
                  photo: { type: "string", format: "binary" },
                  isPrimary: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Photo validated" },
          400: { description: "Invalid photo" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/photos": {
      post: {
        tags: ["Profile"],
        summary: "Upload profile photos (up to 10)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["photo"],
                properties: {
                  photo: { type: "array", items: { type: "string", format: "binary" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Photos uploaded" },
          401: { description: "Unauthorized" },
        },
      },
      get: {
        tags: ["Profile"],
        summary: "Get the authenticated user's uploaded photos",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Photos list returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/photos/{photoId}": {
      delete: {
        tags: ["Profile"],
        summary: "Delete a profile photo",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "photoId", required: true, schema: { type: "string" }, description: "Photo ID to delete" },
        ],
        responses: {
          200: { description: "Photo deleted" },
          401: { description: "Unauthorized" },
          404: { description: "Photo not found" },
        },
      },
    },
    "/api/v1/profile/dating-preferences": {
      patch: {
        tags: ["Profile"],
        summary: "Create or update dating preferences",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  minAge: { type: "number", example: 22 },
                  maxAge: { type: "number", example: 35 },
                  maxDistanceKm: { type: "number", example: 50 },
                  preferredInterestIds: { type: "array", items: { type: "number" } },
                  relationshipIntentions: { type: "array", items: { type: "string" } },
                  religionPreferences: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Dating preferences updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/profile/onboarding/complete": {
      post: {
        tags: ["Profile"],
        summary: "Mark onboarding as complete (validates all required data)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Onboarding completed" },
          400: { description: "Missing required onboarding data" },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ===================== LOCATION =====================
    "/api/v1/locations/popular": {
      get: {
        tags: ["Location"],
        summary: "Get list of popular locations",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Popular locations returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/users/me/location/selection": {
      post: {
        tags: ["Location"],
        summary: "Select a popular location for the authenticated user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["locationId"],
                properties: {
                  locationId: { type: "string", example: "loc_mumbai" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Location selected" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/locations/autocomplete": {
      post: {
        tags: ["Location"],
        summary: "Autocomplete location search using Google Places",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["input"],
                properties: {
                  input: { type: "string", example: "Mumbai" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Autocomplete suggestions returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/users/me/location": {
      post: {
        tags: ["Location"],
        summary: "Save a Google Places location for the authenticated user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["placeId"],
                properties: {
                  placeId: { type: "string", example: "ChIJwe1EZjDG5zsRaYxkjY_tpF0" },
                  displayName: { type: "string", example: "Mumbai, Maharashtra, India" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Location saved" },
          401: { description: "Unauthorized" },
        },
      },
      get: {
        tags: ["Location"],
        summary: "Get the authenticated user's saved location",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User location returned" },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ===================== MATCHES =====================
    "/api/v1/matches/feed": {
      get: {
        tags: ["Match"],
        summary: "Get discovery feed (candidate cards with Trust Score)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Discovery feed returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/reset-feed": {
      post: {
        tags: ["Match"],
        summary: "Reset swipe history to get a fresh discovery feed",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Feed reset successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/people-categories": {
      get: {
        tags: ["Match"],
        summary: "Get categorized candidates for the People screen",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "People categories returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/swipe": {
      post: {
        tags: ["Match"],
        summary: "Swipe on a user (like / dislike / superlike)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetUserId", "action"],
                properties: {
                  targetUserId: { type: "string", example: "usr_abc123" },
                  action: { type: "string", enum: ["like", "dislike", "superlike"], example: "like" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Swipe recorded" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches": {
      get: {
        tags: ["Match"],
        summary: "Get all mutual matches",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Matches list returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/likes": {
      get: {
        tags: ["Match"],
        summary: "Get list of users who liked the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Received likes list returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/sent-likes": {
      get: {
        tags: ["Match"],
        summary: "Get list of users the authenticated user has liked",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Sent likes list returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/block": {
      post: {
        tags: ["Match"],
        summary: "Block a user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetUserId"],
                properties: {
                  targetUserId: { type: "string", example: "usr_xyz789" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User blocked" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/report": {
      post: {
        tags: ["Match"],
        summary: "Report a user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetUserId", "reason"],
                properties: {
                  targetUserId: { type: "string", example: "usr_xyz789" },
                  reason: { type: "string", example: "Inappropriate content" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User reported" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/profile-view": {
      post: {
        tags: ["Match"],
        summary: "Record a profile view and emit real-time event",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["viewedUserId"],
                properties: {
                  viewedUserId: { type: "string", example: "usr_abc123" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Profile view recorded" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/profile-viewers": {
      get: {
        tags: ["Match"],
        summary: "Get recent profile viewers list",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Profile viewers returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/matches/{matchId}/chat": {
      post: {
        tags: ["Match"],
        summary: "Start a chat with a match",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "matchId", required: true, schema: { type: "string" }, description: "Match ID" },
        ],
        responses: {
          200: { description: "Chat started" },
          401: { description: "Unauthorized" },
          404: { description: "Match not found" },
        },
      },
    },
    "/api/v1/matches/{matchId}": {
      delete: {
        tags: ["Match"],
        summary: "Unmatch a user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "matchId", required: true, schema: { type: "string" }, description: "Match ID" },
        ],
        responses: {
          200: { description: "Unmatched successfully" },
          401: { description: "Unauthorized" },
          404: { description: "Match not found" },
        },
      },
    },

    // ===================== MESSAGES =====================
    "/api/v1/messages": {
      post: {
        tags: ["Messages"],
        summary: "Send a message to a user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["recipientId", "content"],
                properties: {
                  recipientId: { type: "string", example: "usr_abc123" },
                  content: { type: "string", example: "Hey, how are you?" },
                  mediaUrl: { type: "string", description: "Optional media URL" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Message sent" },
          401: { description: "Unauthorized" },
        },
      },
      get: {
        tags: ["Messages"],
        summary: "Get all conversations for the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Conversations list returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/messages/{userId}/like": {
      post: {
        tags: ["Messages"],
        summary: "Like (star) a conversation",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "userId", required: true, schema: { type: "string" }, description: "Conversation partner user ID" },
        ],
        responses: {
          200: { description: "Conversation liked" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/messages/{userId}": {
      get: {
        tags: ["Messages"],
        summary: "Get conversation messages with a specific user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "userId", required: true, schema: { type: "string" }, description: "Conversation partner user ID" },
        ],
        responses: {
          200: { description: "Conversation messages returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/messages/{messageId}": {
      delete: {
        tags: ["Messages"],
        summary: "Delete a message",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "messageId", required: true, schema: { type: "string" }, description: "Message ID to delete" },
        ],
        responses: {
          200: { description: "Message deleted" },
          401: { description: "Unauthorized" },
          404: { description: "Message not found" },
        },
      },
    },

    // ===================== CALLS =====================
    "/api/v1/calls/initiate": {
      post: {
        tags: ["Calls"],
        summary: "Initiate a call with another user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["receiverId"],
                properties: {
                  receiverId: { type: "string", example: "usr_abc123" },
                  callType: { type: "string", enum: ["audio", "video"], example: "video" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Call initiated, Agora token returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/calls/incoming": {
      get: {
        tags: ["Calls"],
        summary: "Get current incoming call for the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Incoming call data returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/calls/history": {
      get: {
        tags: ["Calls"],
        summary: "Get call history for the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Call history returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/calls/rtm-token": {
      get: {
        tags: ["Calls"],
        summary: "Get Agora RTM token for real-time messaging",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "RTM token returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/calls/{callId}/accept": {
      post: {
        tags: ["Calls"],
        summary: "Accept an incoming call",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "callId", required: true, schema: { type: "string" }, description: "Call ID" },
        ],
        responses: {
          200: { description: "Call accepted" },
          401: { description: "Unauthorized" },
          404: { description: "Call not found" },
        },
      },
    },
    "/api/v1/calls/{callId}/reject": {
      post: {
        tags: ["Calls"],
        summary: "Reject an incoming call",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "callId", required: true, schema: { type: "string" }, description: "Call ID" },
        ],
        responses: {
          200: { description: "Call rejected" },
          401: { description: "Unauthorized" },
          404: { description: "Call not found" },
        },
      },
    },
    "/api/v1/calls/{callId}/end": {
      post: {
        tags: ["Calls"],
        summary: "End an active call",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "callId", required: true, schema: { type: "string" }, description: "Call ID" },
        ],
        responses: {
          200: { description: "Call ended" },
          401: { description: "Unauthorized" },
          404: { description: "Call not found" },
        },
      },
    },
    "/api/v1/calls/{callId}/status": {
      get: {
        tags: ["Calls"],
        summary: "Get the status of a call",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "callId", required: true, schema: { type: "string" }, description: "Call ID" },
        ],
        responses: {
          200: { description: "Call status returned" },
          401: { description: "Unauthorized" },
          404: { description: "Call not found" },
        },
      },
    },

    // ===================== USERS =====================
    "/api/v1/users/push-token": {
      post: {
        tags: ["Users"],
        summary: "Register or update device push token",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pushToken"],
                properties: {
                  pushToken: { type: "string", description: "FCM or APNs device token", example: "fcm_token_xyz" },
                  platform: { type: "string", enum: ["android", "ios"], default: "android" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Push token registered successfully" },
          400: { description: "pushToken is required" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/users/notification-settings": {
      get: {
        tags: ["Users"],
        summary: "Get notification channel settings",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Notification settings retrieved" },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update notification channel settings",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Notification settings updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
  },
};

export default swaggerDocument;
