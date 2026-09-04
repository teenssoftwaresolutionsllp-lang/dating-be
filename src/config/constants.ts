export const SUPPORTED_LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    isDefault: true,
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    isDefault: false,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    isDefault: false,
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    isDefault: false,
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    isDefault: false,
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    isDefault: false,
  },
];

export const OTP_PURPOSES = {
  LOGIN: "LOGIN",
  REGISTER: "REGISTER",
  RESET_PASSWORD: "RESET_PASSWORD",
};

export const SOCIAL_PROVIDERS = {
  GOOGLE: "google",
  APPLE: "apple",
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
};

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
};

export const OTP_CONFIG = {
  LENGTH: 4,
  EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
  RESEND_COOLDOWN_SECONDS: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 30,
  MAX_ATTEMPTS: 3,
};
