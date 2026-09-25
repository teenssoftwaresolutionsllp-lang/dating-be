# Dating Backend API Documentation

## 1. Overview

This document describes the API routes currently implemented in the dating application backend.

The backend uses:

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Drizzle ORM
- Zod validation
- JWT access tokens
- HTTP-only refresh-token cookies for browsers
- JSON refresh-token transport for React Native clients

The API currently supports:

- health checks
- OTP-based phone authentication
- access-token authentication
- refresh-token sessions
- profile onboarding
- Google Places-based location selection and search
- seeded popular-location suggestions
- profile language selection
- education
- KYC document-photo submission with temporary automatic verification
- single or multiple profile-photo uploads
- dating preferences
- onboarding completion validation
- account deactivation with 30-calendar-day reactivation
- OTP-confirmed permanent account deletion

The following features are not mounted as API routes yet:

- matching and swipe endpoints
- conversations and messaging endpoints
- notification endpoints
- payments and subscription endpoints
- admin moderation endpoints

The database schemas for several of these domains already exist, but a schema
table does not mean that an HTTP route is available.

## 2. Base URL

For local development:

```text
http://localhost:5000
```

All versioned API routes use:

```text
http://localhost:5000/api/v1
```

Examples in this document use the Postman variable:

```text
{{baseUrl}} = http://localhost:5000
```

## 3. Start the Backend

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The server normally starts at:

```text
http://localhost:5000
```

Run the database migrations before testing database-backed routes:

```bash
npm run db:migrate
```

Phone OTP authentication does not require an email address. New phone-authenticated
users are created with `email: null`; an email can be added later during profile
onboarding.

For Cloudinary profile photo uploads, configure these backend-only environment variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

For Google Places autocomplete and place-details calls, configure:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Replace the placeholder values with real credentials before testing uploads or location search. Never expose `CLOUDINARY_API_SECRET` or the Google API key to the frontend or commit them to source control.

## 4. Common Headers

For JSON requests, use:

```http
Content-Type: application/json
```

For protected routes, send the access token:

```http
Authorization: Bearer <access-token>
```

In Postman, this can be configured under the **Authorization** tab:

- Type: `Bearer Token`
- Token: `{{accessToken}}`

## 5. Standard Response Format

Successful response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid request data",
  "code": "VALIDATION_ERROR",
  "errors": {}
}
```

Common status codes:

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 200    | Request completed successfully           |
| 400    | Invalid request or incomplete onboarding |
| 401    | Authentication required or token invalid |
| 403    | Account inactive or permission denied    |
| 404    | User or endpoint not found               |
| 410    | Account was permanently deleted          |
| 429    | OTP resend cooldown is active            |
| 500    | Unexpected server error                  |

## 6. Recommended Postman Test Order

Use this order to test the complete currently implemented flow:

1. Health check
2. Send OTP
3. Verify OTP
4. Save basic profile details
5. Check onboarding status
6. Get the saved profile
7. Get languages and interests
8. Save profile location and relationship details
9. Save selected languages
10. Save education
11. Submit KYC
12. Get KYC status
13. Upload profile photo
14. Get profile photos
15. Save selected interests
16. Save dating preferences
17. Try onboarding completion
18. Test account deactivation and reactivation
19. Test permanent deletion OTP confirmation
20. Test logout or logout-all

The completion request will report `PHOTOS` as missing until at least one profile photo is uploaded to Cloudinary. KYC is temporarily marked
`verified` after a successful document-photo upload.

### 6.1 Location selection and Google Places APIs

The canonical location model is a `locations` record referenced by `profiles.location_id`. Do not store a second copy of city/state/country in the profile update route. Use the dedicated location endpoints below.

#### 6.1.1 Get popular seeded locations

```http
GET {{baseUrl}}/api/v1/locations/popular
Authorization: Bearer {{accessToken}}
```

Purpose:

- returns the popular city list seeded in the backend
- supports direct selection before Google search
- each item includes the internal `locationId` and display `name`

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [
    { "locationId": "2a6e4de2-1a44-42f0-9bfe-0e2060f7aa12", "name": "London" },
    { "locationId": "9ec6d566-92f1-46ec-9e61-fd4c1d0d7762", "name": "Paris" },
    { "locationId": "fab4bc20-7b0d-4b8b-b3e7-2bc6ad5ab178", "name": "New York" }
  ]
}
```

#### 6.1.2 Select a popular location for the authenticated user

```http
POST {{baseUrl}}/api/v1/users/me/location/selection
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Body:

```json
{
  "locationId": "2a6e4de2-1a44-42f0-9bfe-0e2060f7aa12"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Location selected successfully",
  "data": {
    "locationId": "2a6e4de2-1a44-42f0-9bfe-0e2060f7aa12",
    "googlePlaceId": "ChIJdd4hrwug2EcRmSrV3Vo6llI",
    "name": "London",
    "city": "London",
    "state": "England",
    "country": "United Kingdom",
    "latitude": 51.5072,
    "longitude": -0.1276
  }
}
```

#### 6.1.3 Search Google Places suggestions

```http
POST {{baseUrl}}/api/v1/locations/autocomplete
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Body:

```json
{
  "input": "paris",
  "sessionToken": "0d7c59eb-1639-4771-b1f9-9e51b1ac58d0"
}
```

Validation:

- `input` must be a string with at least 2 characters
- `sessionToken` must be a valid UUID

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "placeId": "ChIJ3S-JXm0fTHEFJvTP7Y0g7oQ",
      "text": "Paris, France",
      "mainText": "Paris",
      "secondaryText": "France"
    }
  ]
}
```

The autocomplete result is merged with seeded locations and deduplicated by place ID.

#### 6.1.4 Save a Google Place to the authenticated user profile

```http
POST {{baseUrl}}/api/v1/users/me/location
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Body:

```json
{
  "placeId": "ChIJ3S-JXm0fTHEFJvTP7Y0g7oQ",
  "sessionToken": "0d7c59eb-1639-4771-b1f9-9e51b1ac58d0"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Location saved successfully",
  "data": {
    "locationId": "3efbfc81-6d3d-494f-92ca-0d55729d5d7b",
    "googlePlaceId": "ChIJ3S-JXm0fTHEFJvTP7Y0g7oQ",
    "name": "Paris",
    "city": "Paris",
    "state": "Île-de-France",
    "country": "France",
    "latitude": 48.8566,
    "longitude": 2.3522
  }
}
```

This route creates or reuses the canonical `locations` row and stores the selected place on `profiles.location_id`.

#### 6.1.5 Get the authenticated user's saved location

```http
GET {{baseUrl}}/api/v1/users/me/location
Authorization: Bearer {{accessToken}}
```

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "locationId": "3efbfc81-6d3d-494f-92ca-0d55729d5d7b",
    "googlePlaceId": "ChIJ3S-JXm0fTHEFJvTP7Y0g7oQ",
    "name": "Paris",
    "city": "Paris",
    "state": "Île-de-France",
    "country": "France",
    "latitude": 48.8566,
    "longitude": 2.3522
  }
}
```

If no location has been saved yet, the API returns a 404 with code `LOCATION_NOT_SET`.

## 7. Health and Root Routes

### 7.1 Root status

```http
GET {{baseUrl}}/
```

Purpose:

- confirms that the backend process is running
- displays the API documentation path

Expected response:

```json
{
  "success": true,
  "message": "Dating App Backend is running 🚀",
  "version": "1.0.0",
  "docs": "/api/v1/auth"
}
```

No authentication is required.

### 7.2 Health check

```http
GET {{baseUrl}}/api/health
```

Purpose:

- confirms that the API is reachable
- returns a server timestamp

Expected response:

```json
{
  "success": true,
  "message": "API is healthy ❤️",
  "timestamp": "2026-09-10T10:00:00.000Z"
}
```

No authentication is required.

## 8. Authentication Routes

Authentication routes are mounted under:

```text
/api/v1/auth
```

### 8.1 Send OTP

```http
POST {{baseUrl}}/api/v1/auth/send-otp
```

Purpose:

- starts phone authentication
- creates a hashed OTP record in `otp_verifications`
- sends/simulates the OTP
- applies the resend cooldown

Headers:

```http
Content-Type: application/json
```

Request body:

```json
{
  "phone": "9876543210",
  "countryCode": "+91",
  "preferredLanguage": "en"
}
```

Validation:

- phone must contain exactly 10 digits after normalization
- country code defaults to `+91`
- preferred language is optional
- preferred language must be supported by the configured language list

Development response example:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to +91 9876543210",
  "data": {
    "phone": "9876543210",
    "countryCode": "+91",
    "purpose": "LOGIN",
    "expiresIn": 600,
    "resendCooldown": 30,
    "devOtp": "1234"
  }
}
```

Important:

- `devOtp` is returned only when `NODE_ENV` is not `production`.
- Do not expose or use development OTP output in production.
- Save the `devOtp` value in a Postman variable for local testing.

Example Postman **Tests** script for development:

```javascript
const json = pm.response.json();
if (json.data && json.data.devOtp) {
  pm.environment.set("devOtp", json.data.devOtp);
}
```

### 8.2 Resend OTP

```http
POST {{baseUrl}}/api/v1/auth/resend-otp
```

Purpose:

- creates and sends a fresh four-digit OTP
- applies the 30-second resend cooldown
- replaces the active OTP verification attempt for the phone number

Request body:

```json
{
  "phone": "9876543210",
  "countryCode": "+91",
  "preferredLanguage": "en"
}
```

Validation is the same as **Send OTP**. The response has the same shape as
**Send OTP**, including `devOtp` outside production. A request made during the
cooldown returns `429 OTP_COOLDOWN_ACTIVE`.

### 8.3 Verify OTP

```http
POST {{baseUrl}}/api/v1/auth/verify-otp
```

Purpose:

- verifies the OTP
- creates a new user if the phone number does not exist
- starts the user at `BASIC_DETAILS`
- creates a session in `user_sessions`
- returns an access token
- sets an HTTP-only refresh-token cookie

Request body:

```json
{
  "phone": "9876543210",
  "countryCode": "+91",
  "otp": "{{devOtp}}",
  "preferredLanguage": "en"
}
```

Validation:

- OTP must contain exactly four digits
- phone and country code are normalized
- preferred language must be supported when supplied

Expected response shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Account created and verified successfully",
  "data": {
    "isNewUser": true,
    "user": {
      "id": "user-uuid",
      "userId": "user-uuid",
      "phone": "9876543210",
      "countryCode": "+91",
      "preferredLanguage": "en",
      "role": "user",
      "isVerified": true,
      "profileCompleted": false,
      "createdAt": "2026-09-10T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "expiresIn": "15m",
      "refreshExpiresIn": "7d"
    }
  }
}
```

The refresh token is set as an HTTP-only cookie and is also included in
`data.tokens.refreshToken`. This JSON response is the same for browser,
Thunder Client, Postman, and React Native clients. React Native clients should
store the token securely with `expo-secure-store`.

Postman **Tests** script:

```javascript
const json = pm.response.json();
if (json.data && json.data.tokens && json.data.tokens.accessToken) {
  pm.environment.set("accessToken", json.data.tokens.accessToken);
}
```

In Postman, check the **Cookies** manager after this request and confirm that `refreshToken` exists for the API host.

### 8.4 Refresh access token

```http
POST {{baseUrl}}/api/v1/auth/refresh-token
```

Purpose:

- reads the refresh token from the HTTP-only cookie
- verifies the JWT
- checks the active database session
- checks the account status
- rotates the refresh token
- returns a new access token

No JSON request body is required by the current controller.

Postman requirements:

- use the same Postman domain and environment as the verify request
- ensure the `refreshToken` cookie is present
- do not manually delete the cookie before sending the request

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJ...",
      "expiresIn": "15m",
      "refreshExpiresIn": "7d"
    }
  }
}
```

Postman **Tests** script:

```javascript
const json = pm.response.json();
if (json.data && json.data.tokens && json.data.tokens.accessToken) {
  pm.environment.set("accessToken", json.data.tokens.accessToken);
}
```

Login and refresh responses include the refresh token in JSON for every client.
Clients may send it in the `refreshToken` request field, and browser clients
also receive it through the HTTP-only cookie. The complete React Native example
is in [Section 8.7](#87-react-native-authentication-example).

### 8.5 Logout

```http
POST {{baseUrl}}/api/v1/auth/logout
```

Purpose:

- reads the refresh token cookie
- revokes that session in `user_sessions`
- clears the refresh-token cookie

No access token is required by the current route.

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully"
}
```

### 8.6 Logout all devices

```http
POST {{baseUrl}}/api/v1/auth/logout-all
```

Purpose:

- requires a valid access token
- revokes every active session for the authenticated user
- clears the refresh-token cookie

Headers:

```http
Authorization: Bearer {{accessToken}}
```

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out from all devices successfully"
}
```

### 8.7 React Native authentication example

React Native does not automatically manage browser cookies. Use the access
token for protected requests and securely store the refresh token with the
platform keychain. Expo applications can use `expo-secure-store`:

```bash
npx expo install expo-secure-store
```

For a physical device, replace `localhost` with the development computer's
LAN IP address. For example:

```ts
const API_URL = "http://192.168.1.10:5000/api/v1";
```

Verify the OTP. The response shape is the same for every client:

```ts
import * as SecureStore from "expo-secure-store";

const response = await fetch(`${API_URL}/auth/verify-otp`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    phone: "9876543210",
    countryCode: "+91",
    otp: "1234",
    preferredLanguage: "en",
  }),
});

const result = await response.json();
if (!response.ok) throw new Error(result.message);

await SecureStore.setItemAsync("refreshToken", result.data.tokens.refreshToken);
const accessToken = result.data.tokens.accessToken;
```

Call protected endpoints with the access token:

```ts
const profileResponse = await fetch(`${API_URL}/profile/me`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

When the access token expires, refresh it and replace both stored values:

```ts
const refreshToken = await SecureStore.getItemAsync("refreshToken");
const response = await fetch(`${API_URL}/auth/refresh-token`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ refreshToken }),
});

const result = await response.json();
if (!response.ok) throw new Error(result.message);

await SecureStore.setItemAsync("refreshToken", result.data.tokens.refreshToken);
const newAccessToken = result.data.tokens.accessToken;
```

Logout the current React Native session by sending the stored refresh token:

```ts
const refreshToken = await SecureStore.getItemAsync("refreshToken");
await fetch(`${API_URL}/auth/logout`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ refreshToken }),
});
await SecureStore.deleteItemAsync("refreshToken");
```

### 8.8 Authentication profile

```http
GET {{baseUrl}}/api/v1/auth/profile
```

Purpose:

- verifies the access token
- returns the authenticated user account data
- does not return the full onboarding profile record

Headers:

```http
Authorization: Bearer {{accessToken}}
```

Expected response shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "userId": "user-uuid",
      "phone": "9876543210",
      "countryCode": "+1",
      "preferredLanguage": "en",
      "role": "user",
      "isVerified": true,
      "isActive": true,
      "profileCompleted": false,
      "createdAt": "2026-09-10T10:00:00.000Z"
    }
  }
}
```

### 8.9 Account lifecycle routes

Account lifecycle routes are mounted under:

```text
/api/v1/account
```

All account lifecycle routes require:

```http
Authorization: Bearer {{accessToken}}
```

#### 8.9.1 Deactivate account

```http
POST {{baseUrl}}/api/v1/account/me/deactivate
```

Purpose:

- hides the account from normal active-user flows
- revokes the user’s active sessions
- sets the account status to `deactivated`
- schedules permanent deletion 30 calendar days later

No request body is required.

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Account deactivated. Log in within 30 calendar days to reactivate it; otherwise all account data will be permanently deleted.",
  "data": {
    "scheduledDeletionAt": "2026-10-23T12:00:00.000Z"
  }
}
```

After deactivation, discard the current access and refresh tokens. The user
must use the normal phone OTP login flow to return.

#### 8.9.2 Reactivate a deactivated account

There is no separate reactivation endpoint. Reactivation happens during:

```http
POST {{baseUrl}}/api/v1/auth/verify-otp
```

If the phone belongs to a `deactivated` account and the 30-day deadline has not
passed, successful OTP verification:

- changes the status back to `active`
- clears `deactivatedAt` and `scheduledDeletionAt`
- creates a new authenticated session
- returns new access and refresh tokens

If the deadline has passed, the old account data is permanently deleted and
the verified phone number starts a completely new account with a new user ID.

#### 8.9.3 Request permanent-deletion OTP

```http
POST {{baseUrl}}/api/v1/account/me/delete/request-otp
```

Purpose:

- starts permanent deletion confirmation
- sends an OTP to the phone number stored on the authenticated account
- does not delete any data

The phone number must not be sent in the request body. The backend reads it
from the authenticated user record.

No request body is required.

Development response example:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Account deletion OTP sent to your registered phone number.",
  "data": {
    "expiresIn": 600,
    "resendCooldown": 30,
    "devOtp": "1234"
  }
}
```

`devOtp` is returned only outside production. Production clients must use the
OTP received by SMS. A new request during the cooldown returns
`429 OTP_COOLDOWN_ACTIVE`.

#### 8.9.4 Confirm permanent deletion

```http
POST {{baseUrl}}/api/v1/account/me/delete/confirm
```

Request body:

```json
{
  "otp": "1234"
}
```

The OTP must contain exactly four digits. The backend verifies an OTP with the
dedicated `DELETE_ACCOUNT` purpose and the authenticated user ID. It does not
accept a phone number or user ID from the client.

On success, the backend:

- deletes the user row and cascading related database records
- removes profile-related data, sessions, messages, matches, settings, and
  other records configured with user foreign-key cascades
- removes the user’s Cloudinary profile assets when Cloudinary is configured
- releases the old phone number for future registration

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Account and all related data permanently deleted."
}
```

After success, clear all locally stored access and refresh tokens. The old
account cannot be reactivated. If the same phone number is used later, OTP
verification creates a new user ID and empty profile.

Common deletion errors:

| Code                               | Meaning                             |
| ---------------------------------- | ----------------------------------- |
| `DELETE_OTP_NOT_FOUND`             | No active deletion OTP exists       |
| `DELETE_OTP_EXPIRED`               | Deletion OTP has expired            |
| `DELETE_OTP_MAX_ATTEMPTS_EXCEEDED` | Too many incorrect attempts         |
| `INVALID_DELETE_OTP`               | Submitted deletion OTP is incorrect |
| `OTP_COOLDOWN_ACTIVE`              | A new OTP cannot be requested yet   |

## 9. Profile and Onboarding Routes

These routes are mounted under `/api/v1/profile`.

Protected routes require:

```http
Authorization: Bearer {{accessToken}}
```

### 9.1 Get onboarding status

```http
GET {{baseUrl}}/api/v1/profile/onboarding/status
```

Purpose:

- returns the saved onboarding progress
- lets the web or mobile frontend resume at the correct screen
- reports the step derived from saved onboarding records

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Onboarding status retrieved successfully",
  "data": {
    "onboardingStep": "BASIC_DETAILS",
    "completed": false
  }
}
```

### 9.2 Get complete profile

```http
GET {{baseUrl}}/api/v1/profile/my-profile
```

Purpose:

- loads all saved onboarding data when the app opens
- supports Back navigation and field pre-population
- returns the profile owned by the authenticated user
- does not return hashed KYC document numbers or internal file storage keys

Expected response before profile creation:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "profile": null,
    "languages": [],
    "interests": [],
    "education": null,
    "kyc": null,
    "photos": [],
    "datingPreferences": null
  }
}
```

Expected response after saving data:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "profile": {
      "id": "profile-uuid",
      "userId": "user-uuid",
      "name": "Rahul",
      "dateOfBirth": "1998-06-15",
      "gender": "male",
      "heightCm": 175,
      "religion": "Hindu",
      "city": "Kolkata",
      "state": "West Bengal",
      "country": "India",
      "latitude": 22.5726,
      "longitude": 88.3639,
      "relationshipStatus": "single",
      "bio": null
    },
    "languages": [{ "id": 1, "name": "English" }],
    "interests": [{ "id": 2, "name": "Travel", "category": "lifestyle" }],
    "education": {
      "educationLevel": "bachelors",
      "qualification": "B.Tech",
      "profession": "Software Engineer"
    },
    "kyc": {
      "documentType": "passport",
      "status": "verified",
      "submittedAt": "2026-09-18T10:00:00.000Z",
      "verifiedAt": "2026-09-18T10:00:00.000Z",
      "rejectionReason": null
    },
    "photos": [
      {
        "id": "photo-uuid",
        "url": "https://res.cloudinary.com/example/image/upload/profile.jpg",
        "displayOrder": 0,
        "isPrimary": true,
        "verificationStatus": "pending",
        "moderationStatus": "pending"
      }
    ],
    "datingPreferences": {
      "minAge": 24,
      "maxAge": 32,
      "maxDistanceKm": 50,
      "preferredGenders": ["female"]
    }
  }
}
```

### 9.2.1 Discover people

Both endpoints require a Bearer access token and return only card-safe data. They exclude the authenticated user, inactive accounts, hidden profiles, and users already swiped by the authenticated user.

#### Nearby people

```http
GET {{baseUrl}}/api/v1/people/nearby?radiusKm=50&page=1&limit=20
```

`radiusKm` defaults to `50` and accepts values from `1` to `500`. The caller must have saved latitude and longitude. Results are ordered nearest first and include `distanceKm`.

#### People with similar interests

```http
GET {{baseUrl}}/api/v1/people/similar-interests?page=1&limit=20
```

Results are ordered by the number of shared interests and include `sharedInterestCount` and `sharedInterests`.

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Nearby people retrieved successfully",
  "data": [
    {
      "userId": "user-uuid",
      "name": "Aisha",
      "age": 27,
      "gender": "female",
      "bio": "Weekend hiker and reader.",
      "city": "Kolkata",
      "state": "West Bengal",
      "country": "India",
      "photoUrl": "https://res.cloudinary.com/example/image/upload/profile.jpg",
      "distanceKm": 4.2
    }
  ],
  "meta": { "page": 1, "limit": 20, "radiusKm": 50 }
}
```

### 9.3 Save or update profile data

```http
PATCH {{baseUrl}}/api/v1/profile/update-profile
```

Purpose:

- saves profile fields incrementally
- creates the profile row the first time
- updates the same row on later requests
- supports frontend Back and edit behavior
- advances onboarding progress after successful persistence

Example first-screen body:

```json
{
  "name": "Rahul",
  "gender": "male"
}
```

Example birthday and height body:

```json
{
  "dateOfBirth": "1998-06-15",
  "heightCm": 175
}
```

Example relationship body:

```json
{
  "relationshipStatus": "single"
}
```

Location should not be submitted here. The current canonical API is the dedicated location flow in section 6.1.

Optional supported profile fields:

```json
{
  "name": "Rahul",
  "dateOfBirth": "1998-06-15",
  "gender": "male",
  "heightCm": 175,
  "religion": "Hindu",
  "relationshipStatus": "single",
  "bio": "Short profile biography"
}
```

Validation:

- at least one field is required
- date must use `YYYY-MM-DD`
- date cannot be in the future
- `heightCm` must be between 100 and 250 cm
- text lengths are limited
- `dateOfBirth` is nullable while onboarding is in progress
- `religion` is optional and stores the user's own religion
- location is stored through the dedicated `locations` table and `profiles.location_id`, not in profile update fields

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile saved successfully",
  "data": {
    "profile": {}
  }
}
```

### 9.4 Upload one or multiple profile photos to Cloudinary

```http
POST {{baseUrl}}/api/v1/profile/photos
```

Purpose:

- accepts one or multiple profile images as `multipart/form-data`
- uploads the image to Cloudinary using the authenticated user's folder
- stores the Cloudinary `public_id` and `secure_url` in `profile_photos`
- marks the first uploaded photo as the primary photo
- advances onboarding progress to `PHOTOS`

Postman setup:

1. Select the **Body** tab.
2. Select **form-data**.
3. Add one or more fields named `photo`.
4. Change its type from **Text** to **File**.
5. Select a JPEG, PNG, or WebP file up to 5 MB.
6. Add `Authorization: Bearer {{accessToken}}` under the **Headers** tab.

The route accepts up to 10 files per request. Each file must be JPEG, PNG, or
WebP and no larger than 5 MB. The first uploaded photo is primary when the user
does not already have a primary photo.

Expected response:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "3 profile photos uploaded successfully",
  "data": {
    "photos": [
      {
        "id": "photo-uuid",
        "userId": "user-uuid",
        "storageKey": "dating-app/profiles/user-uuid/user-uuid-1234567890",
        "url": "https://res.cloudinary.com/example/image/upload/v123/dating-app/profiles/user-uuid/user-uuid-1234567890.jpg",
        "displayOrder": 0,
        "isPrimary": true,
        "verificationStatus": "pending"
      }
    ]
  }
}
```

The image can be opened directly using the returned Cloudinary `url`.

Cloudinary folder format:

```text
dating-app/profiles/{userId}
```

### 9.5 Get profile photos

```http
GET {{baseUrl}}/api/v1/profile/photos
```

Purpose:

- returns the authenticated user's uploaded photo metadata
- allows the frontend to display photos after reopening the app or pressing Back

Headers:

```http
Authorization: Bearer {{accessToken}}
```

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile photos retrieved successfully",
  "data": {
    "photos": []
  }
}
```

### 9.6 Delete a profile photo

```http
DELETE {{baseUrl}}/api/v1/profile/photos/:photoId
```

Purpose:

- deletes the selected photo metadata
- deletes the Cloudinary asset using the stored `storageKey`
- checks that the photo belongs to the authenticated user before deleting

Example:

```http
DELETE {{baseUrl}}/api/v1/profile/photos/PHOTO_UUID
```

Headers:

```http
Authorization: Bearer {{accessToken}}
```

If the photo belongs to another user or does not exist, the API returns `PHOTO_NOT_FOUND`.

### 9.7 List languages

```http
GET {{baseUrl}}/api/v1/profile/languages
```

Purpose:

- returns predefined languages
- supplies language choices for the onboarding UI
- does not allow normal users to create languages

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Languages retrieved successfully",
  "data": {
    "languages": [
      {
        "id": 1,
        "name": "English"
      }
    ]
  }
}
```

### 9.8 Save profile languages

```http
PATCH {{baseUrl}}/api/v1/profile/languages
```

Request body:

```json
{
  "languageIds": [1, 3]
}
```

Purpose:

- replaces the user’s complete language selection
- validates that all IDs exist
- prevents duplicate profile-language records
- advances onboarding progress to `EDUCATION`

Validation:

- at least one language is required
- maximum 10 language IDs
- IDs must be positive integers
- duplicate IDs are rejected
- every ID must exist in `languages`

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile languages saved successfully",
  "data": {
    "languageIds": [1, 3]
  }
}
```

### 9.9 Save education

```http
PATCH {{baseUrl}}/api/v1/profile/education
```

Request body:

```json
{
  "educationLevel": "BACHELORS",
  "qualification": "Computer Science",
  "profession": "Software Engineer",
  "occupation": "Backend Developer",
  "companyName": "ABC Technologies",
  "incomeRange": "5_10_LPA"
}
```

Purpose:

- creates or updates the authenticated user’s education record
- allows the frontend to retry the same request safely
- prevents more than one education row per user
- advances onboarding progress to `KYC`

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Education saved successfully",
  "data": {
    "education": {}
  }
}
```

### 9.10 Submit KYC document photo

```http
POST {{baseUrl}}/api/v1/profile/kyc
```

Request content type:

```http
Content-Type: multipart/form-data
```

Postman form-data fields:

```text
documentType: passport
documentNumber: A123456789 (optional)
documentPhoto: <JPEG, PNG, or WebP file, maximum 5 MB>
```

The file field must be named `documentPhoto`. The document number is hashed
with SHA-256 when supplied. The current temporary flow marks a successful
upload as `verified`; manual or provider-based review can be added later.

Example fields:

```text
documentType = passport
documentNumber = A123456789
documentPhoto = passport.jpg
```

Purpose:

- stores the authenticated user’s KYC submission
- hashes the document number with SHA-256
- never stores the raw document number
- updates an existing KYC record instead of duplicating it
- makes KYC eligible for onboarding completion with status `verified`

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "KYC submitted successfully",
  "data": {
    "status": "verified"
  }
}
```

The raw document number and stored hash are never returned.

### 9.11 Get KYC status

```http
GET {{baseUrl}}/api/v1/profile/kyc
```

Purpose:

- returns the current KYC status
- does not expose sensitive document information

Expected response when submitted:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "KYC status retrieved successfully",
  "data": {
    "status": "verified"
  }
}
```

Possible status values currently include:

```text
pending
verified
rejected
```

### 9.12 List interests

```http
GET {{baseUrl}}/api/v1/profile/interests
```

Purpose:

- returns predefined interest master data
- provides choices for the onboarding UI
- does not allow normal users to create interests

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Interests retrieved successfully",
  "data": {
    "interests": [
      {
        "id": 1,
        "name": "Photography",
        "category": "Creative"
      }
    ]
  }
}
```

### 9.13 Save profile interests

```http
PUT {{baseUrl}}/api/v1/profile/interests
```

Request body:

```json
{
  "interestIds": [1, 2, 5]
}
```

Purpose:

- replaces the user’s complete interest selection
- validates that every interest exists
- rejects duplicate IDs
- prevents duplicate relationship rows
- advances onboarding progress to `PREFERENCES`

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile interests saved successfully",
  "data": {
    "interestIds": [1, 2, 5]
  }
}
```

### 9.14 Save dating preferences

```http
PATCH {{baseUrl}}/api/v1/profile/dating-preferences
```

Request body:

```json
{
  "minAge": 24,
  "maxAge": 30,
  "maxDistanceKm": 50,
  "preferredGenders": ["female"],
  "relationshipIntentions": ["marriage"],
  "religionPreferences": ["Hindu", "Christian"],
  "preferredInterestIds": [1, 3, 7],
  "communityPreferences": ["ANY"],
  "verifiedOnly": false
}
```

Purpose:

- creates or updates one dating-preferences record for the user
- prevents duplicate preference rows
- supports safe retries and edits

Validation:

- minimum age is at least 18
- maximum age cannot be lower than minimum age
- `maxDistanceKm` must be between 1 and 1000
- preference arrays must contain valid strings or positive interest IDs
- `verifiedOnly` must be boolean when supplied

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dating preferences saved successfully",
  "data": {
    "preferences": {}
  }
}
```

### 9.15 Complete onboarding

```http
POST {{baseUrl}}/api/v1/profile/onboarding/complete
```

Request body:

```json
{}
```

Purpose:

- performs final database-backed completeness validation
- derives completion from saved profile and related records
- does not trust a request body flag such as `completed: true`
- derives the current onboarding step from profile and related records
- returns success only when all requirements pass

Incomplete response example:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Profile onboarding is incomplete",
  "code": "ONBOARDING_INCOMPLETE",
  "errors": {
    "missingSteps": ["KYC", "PHOTOS"]
  }
}
```

Successful response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile onboarding completed successfully",
  "data": {
    "completed": true,
    "missingSteps": []
  }
}
```

Current completion requirements:

- basic profile fields
- date of birth
- height
- at least one location value: city, state, country, or both coordinates
- relationship status
- at least one language
- education
- verified KYC
- at least one photo
- at least one interest
- dating preferences

This endpoint reports `PHOTOS` as missing until at least one profile photo is uploaded to Cloudinary.
KYC must have status `verified`; the current upload flow sets this immediately
after a successful document-photo upload.

## 10. Postman Environment Setup

Create a Postman environment with:

| Variable      | Initial value           | Purpose                              |
| ------------- | ----------------------- | ------------------------------------ |
| `baseUrl`     | `http://localhost:5000` | Backend URL                          |
| `accessToken` | empty                   | Current JWT access token             |
| `devOtp`      | empty                   | Development OTP returned by send-otp |

Recommended Postman request order:

1. `GET {{baseUrl}}/api/health`
2. `POST {{baseUrl}}/api/v1/auth/send-otp`
3. `POST {{baseUrl}}/api/v1/auth/verify-otp`
4. Save the access token from the verify response
5. `GET {{baseUrl}}/api/v1/profile/onboarding/status`
6. `PATCH {{baseUrl}}/api/v1/profile/update-profile`
7. `GET {{baseUrl}}/api/v1/profile/me`
8. `GET {{baseUrl}}/api/v1/profile/languages`
9. `PATCH {{baseUrl}}/api/v1/profile/languages`
10. `PATCH {{baseUrl}}/api/v1/profile/education`
11. `POST {{baseUrl}}/api/v1/profile/kyc`
12. `GET {{baseUrl}}/api/v1/profile/kyc`
13. `GET {{baseUrl}}/api/v1/profile/interests`
14. `PUT {{baseUrl}}/api/v1/profile/interests`
15. `PATCH {{baseUrl}}/api/v1/profile/dating-preferences`
16. `POST {{baseUrl}}/api/v1/profile/onboarding/complete`

## 11. Error Testing in Postman

### Missing access token

Call a protected route without the Authorization header:

```http
GET {{baseUrl}}/api/v1/profile/me
```

Expected:

```json
{
  "success": false,
  "statusCode": 401,
  "code": "UNAUTHORIZED"
}
```

### Invalid OTP format

Send:

```json
{
  "phone": "9876543210",
  "countryCode": "+91",
  "otp": "12"
}
```

Expected status: `400`.

### Invalid profile value

Send an invalid empty city value in the profile request:

```json
{
  "city": ""
}
```

Expected status: `400` with validation error.

### Duplicate language IDs

```json
{
  "languageIds": [1, 1]
}
```

Expected status: `400` with validation error.

### Invalid master-data ID

```json
{
  "interestIds": [999999]
}
```

Expected code:

```text
INVALID_INTEREST_IDS
```

### Incomplete onboarding

Call completion before saving all required records.

Expected code:

```text
ONBOARDING_INCOMPLETE
```

## 12. Data Ownership and Security

The backend does not accept user ownership from the request body for profile-related operations.

The authenticated identity comes from the access token and is placed in:

```ts
req.user.userId;
```

The backend uses that value to access:

- profile
- languages
- education
- KYC
- interests
- dating preferences
- onboarding status

KYC document numbers are hashed before storage. The raw document number and hash are not returned to clients.

The `users.status` field represents account status only:

```text
active
suspended
blocked
deleted
```

Onboarding progress is derived from the saved profile, languages, education,
KYC, photos, interests, and dating-preferences records. It is not stored in
removed `users.onboarding_step` or `users.onboarding_completed_at` columns.

## 13. Current Database Tables Used by Onboarding

| Table                | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `users`              | Account, authentication, and status data                                   |
| `user_sessions`      | Authenticated sessions                                                     |
| `profiles`           | Core profile details, religion, and the selected location reference         |
| `locations`          | Canonical Google Place and coordinate rows used by profile location selection |
| `languages`          | Predefined language master data                                            |
| `profile_languages`  | User-language relationships                                                |
| `education`          | Education level and qualification                                          |
| `kyc_verifications`  | Hashed KYC data, document image metadata, and status                       |
| `profile_photos`     | Cloudinary profile photo metadata                                          |
| `interests`          | Predefined interest master data                                            |
| `profile_interests`  | User-interest relationships                                                |
| `dating_preferences` | Age, distance, gender, religion, intention, and preferred-interest filters |

## 14. Known Limitations

1. Clients must securely store refresh tokens when using JSON refresh-token transport.
2. Languages and interests require master data to be inserted before selection requests can succeed.
3. Profile photos are stored in Cloudinary; the local filesystem is not used for new profile photo uploads.
4. KYC uploads are currently marked `verified` immediately. Admin or provider verification is not implemented yet.
5. Google Places and seeded location APIs require a valid `GOOGLE_MAPS_API_KEY` in the server environment.
6. The current documentation reflects the implemented API and should be updated whenever a new route is added.

## 15. Implementation Verification

The following commands are available for verification:

```bash
npm run typecheck
npm run build
npm test
npm run db:migrate
```

The current workspace still has unrelated TypeScript errors in the message,
user, and match modules. The migration runner also requires the historical SQL
files referenced by the migration journal; the nullable-email change is included
in `0026_allow-null-user-email.sql` and has been applied to the configured local
database.
