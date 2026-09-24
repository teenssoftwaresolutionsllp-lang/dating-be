import axios, { isAxiosError } from "axios";
import type { AppError } from "../types/index";

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places";
const AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat.mainText,suggestions.placePrediction.structuredFormat.secondaryText";
const DETAILS_FIELD_MASK = "id,displayName,addressComponents,location";

interface GoogleText {
  text?: string;
}

interface GooglePlacePrediction {
  placeId?: string;
  text?: GoogleText;
  structuredFormat?: {
    mainText?: GoogleText;
    secondaryText?: GoogleText;
  };
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{ placePrediction?: GooglePlacePrediction }>;
}

export interface GoogleAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

export interface GooglePlaceDetails {
  id?: string;
  displayName?: GoogleText;
  addressComponents?: GoogleAddressComponent[];
  location?: { latitude?: number; longitude?: number };
}

const createGoogleError = (
  message: string,
  statusCode: number,
  code: string,
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const handleGoogleError = (error: unknown, invalidPlace = false): never => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 429) {
      throw createGoogleError(
        "Google Places rate limit reached",
        429,
        "GOOGLE_PLACES_RATE_LIMIT",
      );
    }

    if (invalidPlace && (status === 400 || status === 404)) {
      throw createGoogleError(
        "Invalid or unavailable place",
        422,
        "INVALID_PLACE",
      );
    }
  }

  throw createGoogleError(
    "Google Places service is unavailable",
    502,
    "GOOGLE_PLACES_UNAVAILABLE",
  );
};

const getApiKey = (): string => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw createGoogleError(
      "Google Places service is not configured",
      502,
      "GOOGLE_PLACES_NOT_CONFIGURED",
    );
  }
  return apiKey;
};

class GooglePlacesService {
  async getPlaceSuggestions(
    input: string,
    sessionToken: string,
  ): Promise<
    Array<{
      placeId: string;
      text: string;
      mainText: string;
      secondaryText: string;
    }>
  > {
    try {
      const response = await axios.post<GoogleAutocompleteResponse>(
        `${GOOGLE_PLACES_URL}:autocomplete`,
        {
          input,
          sessionToken,
          includedPrimaryTypes: ["(cities)"],
        },
        {
          headers: {
            "x-goog-api-key": getApiKey(),
            "x-goog-fieldmask": AUTOCOMPLETE_FIELD_MASK,
          },
          timeout: 5000,
        },
      );

      return (response.data.suggestions ?? [])
        .map((suggestion) => suggestion.placePrediction)
        .filter((prediction): prediction is GooglePlacePrediction =>
          Boolean(prediction?.placeId && prediction.text?.text),
        )
        .map((prediction) => ({
          placeId: prediction.placeId as string,
          text: prediction.text?.text as string,
          mainText:
            prediction.structuredFormat?.mainText?.text ??
            prediction.text?.text ??
            "",
          secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
        }));
    } catch (error) {
      return handleGoogleError(error);
    }
  }

  async getPlaceDetails(
    placeId: string,
    sessionToken: string,
  ): Promise<GooglePlaceDetails> {
    try {
      const response = await axios.get<GooglePlaceDetails>(
        `${GOOGLE_PLACES_URL}/${encodeURIComponent(placeId)}`,
        {
          params: { sessionToken },
          headers: {
            "x-goog-api-key": getApiKey(),
            "x-goog-fieldmask": DETAILS_FIELD_MASK,
          },
          timeout: 5000,
        },
      );

      return response.data;
    } catch (error) {
      return handleGoogleError(error, true);
    }
  }
}

export default new GooglePlacesService();
