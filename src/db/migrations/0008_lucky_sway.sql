WITH location_matches AS (
	SELECT
		profile.id AS profile_id,
		location.id AS location_id,
		row_number() OVER (
			PARTITION BY profile.id
			ORDER BY
				CASE
					WHEN profile.state IS NOT NULL
						AND lower(btrim(location.state)) = lower(btrim(profile.state))
					THEN 0 ELSE 1
				END,
				CASE
					WHEN profile.latitude IS NOT NULL
						AND profile.longitude IS NOT NULL
						AND location.latitude IS NOT NULL
						AND location.longitude IS NOT NULL
					THEN 0 ELSE 1
				END,
				CASE
					WHEN profile.latitude IS NOT NULL
						AND profile.longitude IS NOT NULL
						AND location.latitude IS NOT NULL
						AND location.longitude IS NOT NULL
					THEN power(location.latitude - profile.latitude, 2)
						+ power(location.longitude - profile.longitude, 2)
					ELSE 0
				END,
				location.is_seeded DESC,
				location.created_at,
				location.id
		) AS match_rank
	FROM profiles AS profile
	JOIN locations AS location
		ON lower(btrim(location.city)) = lower(btrim(profile.city))
		AND (
			profile.country IS NULL
			OR location.country IS NULL
			OR lower(btrim(location.country)) = lower(btrim(profile.country))
		)
	WHERE profile.location_id IS NULL
		AND profile.city IS NOT NULL
)
UPDATE profiles AS profile
SET location_id = location_matches.location_id
FROM location_matches
WHERE profile.id = location_matches.profile_id
	AND location_matches.match_rank = 1;--> statement-breakpoint
DROP INDEX "profiles_city_idx";--> statement-breakpoint
DROP INDEX "profiles_lat_long_idx";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "longitude";