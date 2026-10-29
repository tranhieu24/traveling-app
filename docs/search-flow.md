# Search flow

The mobile Search follows screens 4-9 in Traveling App.pdf and UC004-UC009 in the design report. Where, When and Guests use a local draft; Search applies it. Closing discards the draft. Results stay inside the Search tab.

- Destinations come from active listings: public `GET /api/v1/destinations?q=Bali&limit=8` returns city/country suggestions. Anywhere and region cards are also available.
- A selected city sends `city`, `country` and `cityExact=true` to `GET /api/v1/listings`. Legacy city substring matching remains the default for callers without `cityExact`.
- Dates must be supplied together, from today in UTC, with checkout later than checkin and at most 365 nights. Anytime omits both dates.
- Search requires at least one adult. `guests` is adults plus children; the same split is carried into the booking quote UI. The API filters by total listing capacity.
- `Present total price` requires dates and displays backend `pricing.tripTotal`, including configured tax and fees, as required by the report. Nightly price filters always use USD before tax and fees.
- Filter drafts apply only with View Results. Clear all resets advanced filters while preserving destination, dates and guests. Closing discards unapplied changes.
- `roomTypes=entire_place,private_room` accepts any selected type (OR). Legacy singular `roomType` still works. Bedrooms, beds and bathrooms are minimum counts.
- `amenityIds=id1,id2` requires every selected amenity (AND).
- Results consume the listing pagination metadata and fetch subsequent pages. Load failures are distinguished from searches with zero matches.

All discovery endpoints remain available to guests. Favorite and booking operations continue to require authentication. No database migration is needed for these search changes.
