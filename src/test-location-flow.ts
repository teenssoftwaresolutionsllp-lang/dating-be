import assert from "node:assert/strict";
import { describe, it } from "node:test";

import LocationService from "./services/location.service";

describe("location feature", () => {
  it("normalizes Google place details to the canonical location shape", () => {
    const result = LocationService.normalizeGooglePlaceDetails({
      place_id: "ChIJ123",
      display_name: "Delhi, India",
      city: "Delhi",
      state: "National Capital Territory of Delhi",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.googlePlaceId, "ChIJ123");
    assert.equal(result.name, "Delhi");
    assert.equal(result.city, "Delhi");
    assert.equal(result.state, "National Capital Territory of Delhi");
    assert.equal(result.country, "India");
    assert.equal(result.latitude, 28.6139);
    assert.equal(result.longitude, 77.209);
  });

  it("accepts Google Places responses that return place ids as id", () => {
    const result = LocationService.normalizeGooglePlaceDetails({
      id: "ChIJ123",
      displayName: {
        text: "Delhi, India",
      },
      addressComponents: [
        { types: ["locality"], longText: "Delhi" },
        {
          types: ["administrative_area_level_1"],
          longText: "National Capital Territory of Delhi",
        },
        { types: ["country"], longText: "India" },
      ],
      location: {
        latitude: 28.6139,
        longitude: 77.209,
      },
    });

    assert.equal(result.googlePlaceId, "ChIJ123");
    assert.equal(result.name, "Delhi");
    assert.equal(result.city, "Delhi");
    assert.equal(result.state, "National Capital Territory of Delhi");
    assert.equal(result.country, "India");
  });

  it("normalizes Google Autocomplete place predictions", () => {
    const results = LocationService.normalizeGoogleAutocompleteResponse({
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJ123",
            text: { text: "Pune, Maharashtra, India" },
            structuredFormat: {
              mainText: { text: "Pune" },
              secondaryText: { text: "Maharashtra, India" },
            },
          },
        },
        { queryPrediction: { text: { text: "Pune restaurants" } } },
      ],
    });

    assert.deepEqual(results, [
      {
        placeId: "ChIJ123",
        text: "Pune, Maharashtra, India",
        mainText: "Pune",
        secondaryText: "Maharashtra, India",
      },
    ]);
  });

  it("requests matching Indian cities from Google Places Autocomplete", async () => {
    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.GOOGLE_MAPS_API_KEY;
    let requestUrl = "";
    let requestInit: RequestInit | undefined;

    process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: "ChIJ123",
                text: { text: "Pune, Maharashtra, India" },
                structuredFormat: {
                  mainText: { text: "Pune" },
                  secondaryText: { text: "Maharashtra, India" },
                },
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      const results = await LocationService.autocompleteLocation("Pune");

      assert.equal(
        requestUrl,
        "https://places.googleapis.com/v1/places:autocomplete",
      );
      assert.equal(requestInit?.method, "POST");
      assert.equal(
        (requestInit?.headers as Record<string, string>)["X-Goog-Api-Key"],
        "test-api-key",
      );
      assert.deepEqual(JSON.parse(String(requestInit?.body)), {
        input: "Pune",
        includedRegionCodes: ["in"],
        includedPrimaryTypes: ["(cities)"],
        languageCode: "en",
      });
      assert.equal(results[0]?.placeId, "ChIJ123");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.GOOGLE_MAPS_API_KEY;
      } else {
        process.env.GOOGLE_MAPS_API_KEY = originalApiKey;
      }
    }
  });

  it("merges seeded and Google suggestions without duplicate place ids", () => {
    const popular = [
      { locationId: "11111111-1111-4111-8111-111111111111", name: "Mumbai" },
      { locationId: "22222222-2222-4222-8222-222222222222", name: "Delhi" },
    ];

    const google = [
      {
        placeId: "ChIJ123",
        text: "Delhi, India",
        mainText: "Delhi",
        secondaryText: "India",
      },
      {
        placeId: "ChIJ456",
        text: "Mumbai, India",
        mainText: "Mumbai",
        secondaryText: "India",
      },
      {
        placeId: "ChIJ789",
        text: "Bengaluru, India",
        mainText: "Bengaluru",
        secondaryText: "India",
      },
    ];

    const merged = LocationService.mergeSuggestionResults(popular, google);

    assert.deepEqual(
      merged.map((item) => item.placeId),
      ["ChIJ123", "ChIJ456", "ChIJ789"],
    );
  });
});
