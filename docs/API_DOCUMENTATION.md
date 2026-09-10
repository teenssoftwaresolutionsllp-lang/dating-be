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
- HTTP-only refresh-token cookies

The API currently supports:

- health checks
- OTP-based phone authentication
- access-token authentication
- refresh-token sessions
- profile onboarding
- languages and interests reference data
- profile language selection
- education
- KYC status and submission
- dating preferences
- onboarding completion validation

The following features are not implemented yet:

- profile photo upload
- object storage integration
- admin verification workflow
- KYC approval workflow
- complete integration test suite

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
13. Save selected interests
14. Save dating preferences
15. Try onboarding completion
16. Test logout or logout-all

The completion request will normally report `PHOTOS` as missing because photo upload is not implemented yet.

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

- phone must contain 7 to 15 digits after normalization
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
    "expiresIn": 300,
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

### 8.2 Verify OTP

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

The refresh token is intentionally not included in the JSON response. It is set as an HTTP-only cookie.

Postman **Tests** script:

```javascript
const json = pm.response.json();
if (json.data && json.data.tokens && json.data.tokens.accessToken) {
  pm.environment.set("accessToken", json.data.tokens.accessToken);
}
```

In Postman, check the **Cookies** manager after this request and confirm that `refreshToken` exists for the API host.

### 8.3 Refresh access token

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

Important React Native note:

- the current refresh controller is cookie-based
- mobile refresh-token body support is not currently enabled
- React Native clients will need a later refresh-token transport update

### 8.4 Logout

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

### 8.5 Logout all devices

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

### 8.6 Authentication profile

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

## 9. Profile and Onboarding Routes

These routes are mounted under `/api/v1`.

Protected routes require:

```http
Authorization: Bearer {{accessToken}}
```

### 9.1 Get onboarding status

```http
GET {{baseUrl}}/api/v1/onboarding/status
```

Purpose:

- returns the saved onboarding progress
- lets the web or mobile frontend resume at the correct screen
- reports whether `onboarding_completed_at` is set

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

### 9.2 Get current profile

```http
GET {{baseUrl}}/api/v1/profile/me
```

Purpose:

- loads saved profile data when the app opens
- supports Back navigation and field pre-population
- returns the profile owned by the authenticated user

Expected response before profile creation:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "profile": null
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
      "height": 175,
      "location": "Kolkata",
      "relationshipStatus": "single",
      "bio": null
    }
  }
}
```

### 9.3 Save or update profile data

```http
PATCH {{baseUrl}}/api/v1/profile
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
  "height": 175
}
```

Example relationship body:

```json
{
  "relationshipStatus": "single"
}
```

Example location body:

```json
{
  "location": "Kolkata"
}
```

Optional supported profile fields:

```json
{
  "name": "Rahul",
  "dateOfBirth": "1998-06-15",
  "gender": "male",
  "height": 175,
  "location": "Kolkata",
  "relationshipStatus": "single",
  "bio": "Short profile biography"
}
```

Validation:

- at least one field is required
- date must use `YYYY-MM-DD`
- date cannot be in the future
- height must be between 100 and 250 cm
- text lengths are limited
- location is stored as a text value for now

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

### 9.4 List languages

```http
GET {{baseUrl}}/api/v1/languages
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

### 9.5 Save profile languages

```http
PUT {{baseUrl}}/api/v1/profile/languages
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

### 9.6 Save education

```http
PUT {{baseUrl}}/api/v1/profile/education
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

### 9.7 Submit KYC

```http
POST {{baseUrl}}/api/v1/kyc
```

Request body:

```json
{
  "documentType": "PASSPORT",
  "documentNumber": "A123456789"
}
```

Purpose:

- stores the authenticated user’s KYC submission
- hashes the document number with SHA-256
- never stores the raw document number
- updates an existing KYC record instead of duplicating it
- advances onboarding progress to `PHOTOS`

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "KYC submitted successfully",
  "data": {
    "status": "pending"
  }
}
```

The raw document number and stored hash are never returned.

### 9.8 Get KYC status

```http
GET {{baseUrl}}/api/v1/kyc
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
    "status": "pending"
  }
}
```

Possible status values currently include:

```text
pending
verified
rejected
```

### 9.9 List interests

```http
GET {{baseUrl}}/api/v1/interests
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

### 9.10 Save profile interests

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

### 9.11 Save dating preferences

```http
PATCH {{baseUrl}}/api/v1/dating-preferences
```

Request body:

```json
{
  "minAge": 24,
  "maxAge": 30,
  "maxDistance": 50,
  "preferredGender": "female",
  "relationshipIntention": "MARRIAGE",
  "religionPreference": "ANY",
  "communityPreference": "ANY",
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
- maximum distance must be between 1 and 1000
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

### 9.12 Complete onboarding

```http
POST {{baseUrl}}/api/v1/onboarding/complete
```

Request body:

```json
{}
```

Purpose:

- performs final database-backed completeness validation
- does not trust `onboarding_step` alone
- does not trust a request body flag such as `completed: true`
- sets `onboarding_step` to `COMPLETED` only when all requirements pass
- sets `onboarding_completed_at` to the current timestamp only on success

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
- location text
- relationship status
- at least one language
- education
- verified KYC
- at least one photo
- at least one interest
- dating preferences

The current project does not yet provide photo upload, so this endpoint normally reports `PHOTOS` as missing.

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
5. `GET {{baseUrl}}/api/v1/onboarding/status`
6. `PATCH {{baseUrl}}/api/v1/profile`
7. `GET {{baseUrl}}/api/v1/profile/me`
8. `GET {{baseUrl}}/api/v1/languages`
9. `PUT {{baseUrl}}/api/v1/profile/languages`
10. `PUT {{baseUrl}}/api/v1/profile/education`
11. `POST {{baseUrl}}/api/v1/kyc`
12. `GET {{baseUrl}}/api/v1/kyc`
13. `GET {{baseUrl}}/api/v1/interests`
14. `PUT {{baseUrl}}/api/v1/profile/interests`
15. `PATCH {{baseUrl}}/api/v1/dating-preferences`
16. `POST {{baseUrl}}/api/v1/onboarding/complete`

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

### Invalid location value

Send an empty location value in the profile request:

```json
{
  "location": ""
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

Onboarding progress is stored separately:

```text
users.onboarding_step
users.onboarding_completed_at
```

## 13. Current Database Tables Used by Onboarding

| Table                | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `users`              | Account status and onboarding progress     |
| `user_sessions`      | Authenticated sessions                     |
| `profiles`           | Core profile details                       |
| `languages`          | Predefined language master data            |
| `profile_languages`  | User-language relationships                |
| `education`          | One education record per user              |
| `kyc_verifications`  | Hashed KYC submission and status           |
| `profile_photos`     | Photo metadata, upload not implemented yet |
| `interests`          | Predefined interest master data            |
| `profile_interests`  | User-interest relationships                |
| `dating_preferences` | One preference record per user             |

## 14. Known Limitations

1. The refresh endpoint currently reads the refresh token from an HTTP-only cookie. React Native body-token refresh support is not implemented yet.
2. Languages and interests require master data to be inserted before selection requests can succeed.
3. Photo routes are not implemented because no object-storage provider is configured.
4. KYC submission creates a `pending` record, but no admin verification workflow exists yet to change it to `verified`.
5. Location search and predefined location IDs are intentionally deferred; onboarding currently stores the selected location as text in `profiles.location`.
6. The current documentation reflects the implemented API and should be updated whenever a new route is added.

## 15. Implementation Verification

The current project has been verified with:

```bash
npm run typecheck
npm run build
npm test
npm run db:migrate
```

These commands confirm TypeScript compilation, the production build, authentication helper tests, and database migration execution.
