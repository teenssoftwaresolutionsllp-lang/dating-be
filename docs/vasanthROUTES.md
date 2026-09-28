# API Routes

Base URL: `http://localhost:5000`

Versioned routes use the `/api/v1` prefix. Protected routes require:

```http
Authorization: Bearer <access-token>
```

## Profile Routes

Mounted at `/api/v1/profile` from `src/routes/profile.routes.ts`.

| Method | Route                                 | Auth | Usage                                                                            |
| ------ | ------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| GET    | `/api/v1/profile/onboarding/status`   | Yes  | Get the saved onboarding step so the client can resume.                          |
| GET    | `/api/v1/profile/me`                  | Yes  | Get the authenticated user's basic profile.                                      |
| GET    | `/api/v1/profile/my-profile`          | Yes  | Get all saved onboarding and profile data.                                       |
| PATCH  | `/api/v1/profile/update-profile`      | Yes  | Create or update core profile fields. Validated with `profileUpdateSchema`.      |
| GET    | `/api/v1/profile/languages`           | No   | Get available language options.                                                  |
| GET    | `/api/v1/profile/interests`           | No   | Get available interest options.                                                  |
| PATCH  | `/api/v1/profile/languages`           | Yes  | Replace the user's selected languages. Validated with `languageSelectionSchema`. |
| PUT    | `/api/v1/profile/interests`           | Yes  | Replace the user's selected interests. Validated with `interestSelectionSchema`. |
| PATCH  | `/api/v1/profile/education`           | Yes  | Create or update education details. Validated with `educationSchema`.            |
| POST   | `/api/v1/profile/kyc`                 | Yes  | Submit KYC data with an optional `documentPhoto` upload.                         |
| GET    | `/api/v1/profile/kyc`                 | Yes  | Get the authenticated user's safe KYC status.                                    |
| POST   | `/api/v1/profile/photos`              | Yes  | Upload up to 10 profile photos using the multipart field `photo`.                |
| GET    | `/api/v1/profile/photos`              | Yes  | Get the user's uploaded photo metadata and URLs.                                 |
| DELETE | `/api/v1/profile/photos/:photoId`     | Yes  | Delete one photo owned by the authenticated user.                                |
| PATCH  | `/api/v1/profile/dating-preferences`  | Yes  | Create or update dating preferences. Validated with `datingPreferencesSchema`.   |
| POST   | `/api/v1/profile/onboarding/complete` | Yes  | Validate required records and complete onboarding.                               |

## Account Routes

Mounted at `/api/v1/account` from `src/routes/account.routes.ts`.

| Method | Route                                   | Auth | Usage                                                                             |
| ------ | --------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| POST   | `/api/v1/account/me/deactivate`         | Yes  | Deactivate the authenticated user's account.                                      |
| POST   | `/api/v1/account/me/delete/request-otp` | Yes  | Request an OTP before permanent account deletion.                                 |
| POST   | `/api/v1/account/me/delete/confirm`     | Yes  | Confirm permanent deletion with the OTP. Validated with `deleteAccountOtpSchema`. |

## Location Routes

Mounted at `/api/v1` from `src/routes/location.routes.ts`.

| Method | Route                                 | Auth | Usage                                                                               |
| ------ | ------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| GET    | `/api/v1/locations/popular`           | Yes  | Get popular seeded locations.                                                       |
| POST   | `/api/v1/locations/autocomplete`      | Yes  | Search Google Places. Rate-limited and validated with `locationAutocompleteSchema`. |
| POST   | `/api/v1/users/me/location`           | Yes  | Save a location for the authenticated user. Validated with `saveLocationSchema`.    |
| POST   | `/api/v1/users/me/location/selection` | Yes  | Select a saved location. Validated with `selectLocationSchema`.                     |
| GET    | `/api/v1/users/me/location`           | Yes  | Get the authenticated user's saved location.                                        |

## Request Examples

### JSON request

```http
PATCH /api/v1/profile/update-profile
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "name": "Aarav",
  "bio": "Weekend trekker"
}
```

### Multipart photo upload

Use `multipart/form-data` with the field name `photo` for profile photos or `documentPhoto` for the KYC document photo.

### Protected route flow

1. Authenticate and obtain an access token.
2. Send the token in the `Authorization` header.
3. Send JSON for normal updates, or `multipart/form-data` for uploads.
4. The route middleware authenticates the user and validates the request before the controller runs.
