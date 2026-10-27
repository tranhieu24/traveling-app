-- ==============================================================================
-- TRAVELING APP - SEED DATA SCRIPT (PostgreSQL / Supabase)
-- Target: Nạp dữ liệu mẫu vào 10 bảng hiện hữu trong DB Supabase
-- Tables: users, categories, amenities, listings, listing_photos, 
--         listing_amenities, favorites, reviews, bookings, payments
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. SCHEMA SYNC (Tự động bổ sung các cột còn thiếu trên Supabase nếu có)
-- -----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- -----------------------------------------------------------------------------
-- 1. USERS (Tài khoản mẫu để liên kết Host & Guest)
-- Giả định các ID UUID tương ứng cho host & khách
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, full_name, avatar_url, phone_number, role, created_at, updated_at)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'host1@travelingapp.com', 'Alexandre Dubois', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80', '+33612345678', 'host', NOW(), NOW()),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'host2@travelingapp.com', 'Kenji Takahashi', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80', '+819012345678', 'host', NOW(), NOW()),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'host3@travelingapp.com', 'Sarah Jenkins', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', '+14155552671', 'host', NOW(), NOW()),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'guest1@travelingapp.com', 'Minh Nguyen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', '+84912345678', 'guest', NOW(), NOW()),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'guest2@travelingapp.com', 'Emma Watson', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', '+447911123456', 'guest', NOW(), NOW()),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'guest3@travelingapp.com', 'Liam O''Connor', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', '+353871234567', 'guest', NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES (5 danh mục chuẩn theo yêu cầu)
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, icon, description, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Beach', 'beach', 'beach-access', 'Bungalows and luxury beachfront villas with sea view', NOW()),
  ('11111111-1111-1111-1111-111111111102', 'Mountain', 'mountain', 'terrain', 'High altitude retreats, alpine chalets and fresh mountain air', NOW()),
  ('11111111-1111-1111-1111-111111111103', 'Camping', 'camping', 'campground', 'Glamping, nature pods, outdoor stargazing experiences', NOW()),
  ('11111111-1111-1111-1111-111111111104', 'Countryside', 'countryside', 'cottage', 'Rustic farmhouses, vineyard estates and peaceful orchards', NOW()),
  ('11111111-1111-1111-1111-111111111105', 'Iconic Cities', 'iconic-cities', 'location-city', 'Prime lofts, skyline penthouses in world capitals', NOW())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. AMENITIES (10 tiện nghi chuẩn theo yêu cầu)
-- -----------------------------------------------------------------------------
INSERT INTO amenities (id, name, icon, category, created_at)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'Wifi', 'wifi', 'Essentials', NOW()),
  ('22222222-2222-2222-2222-222222222202', 'Kitchen', 'silverware-fork-knife', 'Essentials', NOW()),
  ('22222222-2222-2222-2222-222222222203', 'Pool', 'pool', 'Features', NOW()),
  ('22222222-2222-2222-2222-222222222204', 'Free parking', 'car', 'Features', NOW()),
  ('22222222-2222-2222-2222-222222222205', 'Air conditioning', 'air-conditioner', 'Essentials', NOW()),
  ('22222222-2222-2222-2222-222222222206', 'Dedicated workspace', 'laptop', 'Features', NOW()),
  ('22222222-2222-2222-2222-222222222207', 'TV', 'television', 'Features', NOW()),
  ('22222222-2222-2222-2222-222222222208', 'Washer', 'washing-machine', 'Essentials', NOW()),
  ('22222222-2222-2222-2222-222222222209', 'Exercise equipment', 'dumbbell', 'Features', NOW()),
  ('22222222-2222-2222-2222-222222222210', 'BBQ grill', 'fire', 'Features', NOW())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. LISTINGS (12 Listings mẫu tại Asia, Europe, North America)
-- -----------------------------------------------------------------------------
INSERT INTO listings (
  id, host_id, category_id, title, description, property_type, room_type,
  address, city, state_province, country, region, latitude, longitude,
  price_per_night, cleaning_fee, service_fee,
  max_guests, bedrooms, beds, bathrooms,
  rating_avg, review_count, is_active, created_at, updated_at
)
VALUES
  -- 1. ASIA - Bali Villa (Beach)
  (
    '33333333-3333-3333-3333-333333333301',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '11111111-1111-1111-1111-111111111101',
    'Azure Cliffside Infinity Pool Villa',
    'Perched gracefully above the turquoise Indian Ocean in Uluwatu, this luxury eco-villa features open-plan bamboo architecture, a private infinity pool overlooking legendary surf breaks, and daily organic breakfast service. Experience serenity at sunset with panoramic ocean horizons.',
    'Villa', 'Entire place',
    'Jalan Pantai Suluban No. 88, Pecatu', 'Bali', 'Bali', 'Indonesia', 'Asia',
    -8.8155, 115.0884,
    285.00, 45.00, 35.00,
    4, 2, 2, 2,
    4.95, 42, true, NOW(), NOW()
  ),

  -- 2. ASIA - Kyoto Machiya (Iconic Cities)
  (
    '33333333-3333-3333-3333-333333333302',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '11111111-1111-1111-1111-111111111105',
    'Historic Heritage Machiya House & Zen Garden',
    'Step back into classic Japan with this meticulously restored 110-year-old traditional townhouse located in Gion. Features authentic tatami flooring, cedar wood soak tub (hinoki buro), private rock garden, and fiber-optic high-speed internet.',
    'Townhouse', 'Entire place',
    '244 Gionmachi Minamigawa, Higashiyama Ward', 'Kyoto', 'Kansai', 'Japan', 'Asia',
    34.9995, 135.7770,
    210.00, 40.00, 25.00,
    3, 1, 3, 1,
    4.91, 38, true, NOW(), NOW()
  ),

  -- 3. ASIA - Da Nang Oceanfront Penthouse (Beach)
  (
    '33333333-3333-3333-3333-333333333303',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '11111111-1111-1111-1111-111111111101',
    'Panoramic My Khe Beach View Penthouse',
    'Towering high above My Khe Beach, this designer penthouse offers unobstructed 270-degree coastal and Son Tra peninsula views. Enjoy expansive marble balconies, smart entertainment setup, high-pressure rain showers, and immediate access to seafood eateries.',
    'Apartment', 'Entire place',
    '284 Vo Nguyen Giap, Ngu Hanh Son', 'Da Nang', 'Da Nang', 'Vietnam', 'Asia',
    16.0544, 108.2472,
    145.00, 25.00, 18.00,
    5, 3, 3, 2,
    4.88, 29, true, NOW(), NOW()
  ),

  -- 4. ASIA - Chiang Mai Rainforest Glamping (Camping)
  (
    '33333333-3333-3333-3333-333333333304',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '11111111-1111-1111-1111-111111111103',
    'Misty Peak Luxury Safari Dome',
    'Surround yourself with birdsong and cascading jungle mist in Mae Rim valley. Our geodesic eco-domes come with transparent stargazing ceilings, plush king bed, private hydrotherapy plunge pool, and evening campfire BBQ experiences.',
    'Tent', 'Entire place',
    'Moo 2, Pong Yaeng, Mae Rim', 'Chiang Mai', 'Chiang Mai', 'Thailand', 'Asia',
    18.9186, 98.8252,
    120.00, 20.00, 15.00,
    2, 1, 1, 1,
    4.93, 34, true, NOW(), NOW()
  ),

  -- 5. EUROPE - Swiss Alps Chalet (Mountain)
  (
    '33333333-3333-3333-3333-333333333305',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '11111111-1111-1111-1111-111111111102',
    'Matterhorn View Alpine Chalet & Sauna',
    'Nestled on the sunlit slopes of Zermatt, this quintessential timber chalet boasts dramatic vistas of the Matterhorn peak. Complete with a rustic wood-burning stone fireplace, private Finnish sauna, ski-in/ski-out convenience, and gourmet fondue kitchen.',
    'Chalet', 'Entire place',
    'Riedweg 45', 'Zermatt', 'Valais', 'Switzerland', 'Europe',
    46.0207, 7.7491,
    460.00, 65.00, 50.00,
    6, 3, 4, 3,
    4.98, 51, true, NOW(), NOW()
  ),

  -- 6. EUROPE - Santorini Sunset Cave Suite (Beach)
  (
    '33333333-3333-3333-3333-333333333306',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '11111111-1111-1111-1111-111111111101',
    'Oia Caldera Edge Whitewashed Cave Suite',
    'Carved into the volcanic caldera cliff of Oia, this luminous whitewashed suite features a heated cave hot tub overlooking the Aegean caldera. World-class sunset viewing right from your sun lounger with complimentary volcanic wine on arrival.',
    'Cave', 'Entire place',
    'Nik. Nomikou, Oia', 'Santorini', 'South Aegean', 'Greece', 'Europe',
    36.4618, 25.3753,
    390.00, 50.00, 45.00,
    2, 1, 1, 1,
    4.96, 67, true, NOW(), NOW()
  ),

  -- 7. EUROPE - Tuscany Vineyard Estate (Countryside)
  (
    '33333333-3333-3333-3333-333333333307',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '11111111-1111-1111-1111-111111111104',
    'Villa Bella Vista: Chianti Hills & Olive Groves',
    'A 17th-century stone farmhouse surrounded by rolling Chianti vineyards, cypress avenues, and ancient olive trees. Features an outdoor stone pizza oven, private swimming pool, wine tasting cellar, and spacious alfresco dining pergola.',
    'Farm stay', 'Entire place',
    'Strada Provinciale 101, Greve in Chianti', 'Florence', 'Tuscany', 'Italy', 'Europe',
    43.5856, 11.3167,
    320.00, 55.00, 38.00,
    8, 4, 5, 4,
    4.92, 33, true, NOW(), NOW()
  ),

  -- 8. EUROPE - Paris Montmartre Artist Loft (Iconic Cities)
  (
    '33333333-3333-3333-3333-333333333308',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '11111111-1111-1111-1111-111111111105',
    'Chic Montmartre Loft near Sacre-Coeur',
    'Soak in authentic bohemian Paris from this airy top-floor atelier loft. Exposed timber beams, wrought-iron spiral staircase, curated antique furnishings, and postcard views of the Eiffel Tower flickering in the night distance.',
    'Loft', 'Entire place',
    'Rue des Saules, 18th Arrondissement', 'Paris', 'Ile-de-France', 'France', 'Europe',
    48.8872, 2.3399,
    240.00, 45.00, 30.00,
    4, 2, 2, 1,
    4.89, 48, true, NOW(), NOW()
  ),

  -- 9. NORTH AMERICA - Rocky Mountain Timber Lodge (Mountain)
  (
    '33333333-3333-3333-3333-333333333309',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    '11111111-1111-1111-1111-111111111102',
    'Aspen Grand Pine Lodge with Outdoor Jacuzzi',
    'Authentic heavy-timber luxury lodge located minutes from Aspen Mountain gondolas. Vaulted 24-foot cathedral ceilings, massive river rock fireplace, commercial chef kitchen, private heated driveway, and an 8-person sunken spa under pine forests.',
    'Cabin', 'Entire place',
    '720 Red Mountain Road', 'Aspen', 'Colorado', 'United States', 'North America',
    39.1911, -106.8175,
    580.00, 80.00, 65.00,
    10, 4, 6, 4,
    4.97, 39, true, NOW(), NOW()
  ),

  -- 10. NORTH AMERICA - Joshua Tree Stargazer Airstream (Camping)
  (
    '33333333-3333-3333-3333-333333333310',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    '11111111-1111-1111-1111-111111111103',
    'Desert Horizon Retro Airstream & Cowboy Tub',
    'A redesigned 33-foot classic sovereign Airstream sitting on 5 private acres of untouched Mojave desert. Features outdoor cedar shower, cowboy soaking tub, modern AC, vinyl turntable collection, and the Milky Way glistening overhead with zero light pollution.',
    'Camper/RV', 'Entire place',
    'Sunfair Rd, Joshua Tree', 'Joshua Tree', 'California', 'United States', 'North America',
    34.1347, -116.3131,
    175.00, 30.00, 20.00,
    2, 1, 1, 1,
    4.87, 45, true, NOW(), NOW()
  ),

  -- 11. NORTH AMERICA - Manhattan Soho Sky Penthouse (Iconic Cities)
  (
    '33333333-3333-3333-3333-333333333311',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    '11111111-1111-1111-1111-111111111105',
    'SoHo Cast-Iron Architectural Triplex Loft',
    'A showcase of architectural brilliance in historic SoHo. Direct keyed elevator access, 14-foot ceiling heights, original cast-iron Corinthian columns, private landscaped rooftop garden overlooking Lower Manhattan, and custom Italian finishes.',
    'Loft', 'Entire place',
    '128 Mercer Street', 'New York', 'New York', 'United States', 'North America',
    40.7243, -73.9983,
    650.00, 95.00, 75.00,
    6, 3, 3, 3,
    4.94, 52, true, NOW(), NOW()
  ),

  -- 12. NORTH AMERICA - Vermont Maple Hollow Farmhouse (Countryside)
  (
    '33333333-3333-3333-3333-333333333312',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    '11111111-1111-1111-1111-111111111104',
    'Maple Hollow Historic Homestead & Barn',
    'Experience classic New England pastoral beauty in this lovingly restored 1840s clapboard farmhouse. Sits beside a babbling trout brook, surrounded by sugar maples that blaze with autumn colors. Screened porch, artisan wood stove, and cider orchard trails.',
    'Farm stay', 'Entire place',
    '412 Old County Road', 'Woodstock', 'Vermont', 'United States', 'North America',
    43.6242, -72.5187,
    230.00, 40.00, 25.00,
    6, 3, 4, 2,
    4.90, 27, true, NOW(), NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. LISTING PHOTOS (3-5 ảnh chất lượng cao cho mỗi listing)
-- -----------------------------------------------------------------------------
INSERT INTO listing_photos (id, listing_id, photo_url, caption, display_order, is_cover)
VALUES
  -- 1. Bali
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', 'Infinity pool over the Indian Ocean', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', 'Master bedroom with open breeze layout', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', 'Outdoor sunken lounge during sunset', 3, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80', 'En-suite volcanic stone bathtub', 4, false),

  -- 2. Kyoto
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', 'Traditional Japanese garden view from tatami room', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80', 'Exterior facade illuminated in Gion evening', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 'Modernized tea pavilion and dining area', 3, false),

  -- 3. Da Nang
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333303', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', 'Living room overlooking My Khe ocean coast', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333303', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80', 'Sunlit master suite with balcony access', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333303', 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80', 'Modern marble kitchen with breakfast bar', 3, false),

  -- 4. Chiang Mai
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333304', 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80', 'Glamping dome in tropical mountain fog', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333304', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80', 'Private wooden deck and campfire under stars', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333304', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80', 'Cozy interior with canopy king bed', 3, false),

  -- 5. Swiss Alps
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333305', 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80', 'Chalet exterior facing snowy Matterhorn peaks', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333305', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', 'Living area around roaring stone hearth', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333305', 'https://images.unsplash.com/photo-1540518614846-7ede433c4b63?auto=format&fit=crop&w=1200&q=80', 'Cedar wood private sauna room', 3, false),

  -- 6. Santorini
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333306', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80', 'Whitewashed terrace over the Santorini caldera', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333306', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80', 'Cave suite private indoor heated plunge pool', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333306', 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80', 'Breathtaking pastel sunset from private terrace', 3, false),

  -- 7. Tuscany
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333307', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80', 'Rustic stone villa among Chianti hills and cypress trees', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333307', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80', 'Outdoor pool overlooking rolling vineyards', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333307', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80', 'Country kitchen with terra cotta arches', 3, false),

  -- 8. Paris
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333308', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', 'Classic Parisian apartment with balcony and zinc roofs', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333308', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80', 'Sunlit studio bedroom with exposed wooden ceiling beams', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333308', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80', 'Cozy library nook with velvet armchairs', 3, false),

  -- 9. Aspen
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333309', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80', 'Grand wooden lodge glowing in winter evening snow', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333309', 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80', 'Cathedral ceiling great room with floor-to-ceiling glass', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333309', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', 'Steaming hot tub surrounded by snow-covered spruce trees', 3, false),

  -- 10. Joshua Tree
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333310', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', 'Gleaming Airstream in desert wilderness under golden hour', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333310', 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80', 'Cowboy tub and hammock area with Joshua trees', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333310', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80', 'Milky Way galaxy sky view directly above camp', 3, false),

  -- 11. New York SoHo
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333311', 'https://images.unsplash.com/photo-1502005229762-ee1b2b8ab98f?auto=format&fit=crop&w=1200&q=80', 'Industrial cast-iron loft with towering gallery windows', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333311', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', 'Modernist open-plan kitchen and dining area', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333311', 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80', 'Private rooftop terrace facing Manhattan skyline', 3, false),

  -- 12. Vermont
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333312', 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80', 'Quaint white clapboard farmhouse in autumn foliage', 1, true),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333312', 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80', 'Warm wood stove and cozy armchairs in the parlor', 2, false),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333312', 'https://images.unsplash.com/photo-1540518614846-7ede433c4b63?auto=format&fit=crop&w=1200&q=80', 'Rustic timber dining table overlooking the apple orchard', 3, false)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. LISTING AMENITIES (Liên kết Tiện nghi cho 12 Listings)
-- -----------------------------------------------------------------------------
INSERT INTO listing_amenities (listing_id, amenity_id)
VALUES
  -- Listing 1: Bali (Wifi, Kitchen, Pool, Free parking, AC, TV)
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222207'),

  -- Listing 2: Kyoto (Wifi, Kitchen, AC, Dedicated workspace, Washer)
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222206'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222208'),

  -- Listing 3: Da Nang (Wifi, Kitchen, Pool, AC, TV, Washer, Dedicated workspace)
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222206'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222207'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222208'),

  -- Listing 4: Chiang Mai (Wifi, Free parking, BBQ grill)
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222210'),

  -- Listing 5: Swiss Alps (Wifi, Kitchen, Free parking, TV, Exercise equipment, Washer)
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222207'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222208'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222209'),

  -- Listing 6: Santorini (Wifi, AC, Pool, TV)
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222203'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222207'),

  -- Listing 7: Tuscany (Wifi, Kitchen, Pool, Free parking, BBQ grill, Washer)
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222203'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222208'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222210'),

  -- Listing 8: Paris (Wifi, Kitchen, AC, Dedicated workspace, Washer)
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222206'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222208'),

  -- Listing 9: Aspen (Wifi, Kitchen, Pool, Free parking, TV, Exercise equipment, Washer, BBQ grill)
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222203'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222207'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222208'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222209'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222210'),

  -- Listing 10: Joshua Tree (Wifi, AC, Free parking, BBQ grill)
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222210'),

  -- Listing 11: SoHo (Wifi, Kitchen, AC, Dedicated workspace, TV, Washer, Exercise equipment)
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222205'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222206'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222207'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222208'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222209'),

  -- Listing 12: Vermont (Wifi, Kitchen, Free parking, Dedicated workspace, Washer, BBQ grill)
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222202'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222204'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222206'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222208'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222210')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. FAVORITES (Dữ liệu yêu thích mẫu cho guest Minh Nguyen)
-- -----------------------------------------------------------------------------
INSERT INTO favorites (id, user_id, listing_id, created_at)
VALUES
  (gen_random_uuid(), 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '33333333-3333-3333-3333-333333333301', NOW()),
  (gen_random_uuid(), 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '33333333-3333-3333-3333-333333333305', NOW()),
  (gen_random_uuid(), 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '33333333-3333-3333-3333-333333333306', NOW())
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. REVIEWS (20+ bài đánh giá mẫu phong phú)
-- -----------------------------------------------------------------------------
INSERT INTO reviews (id, listing_id, user_id, rating, comment, cleanliness_rating, accuracy_rating, checkin_rating, communication_rating, location_rating, value_rating, created_at)
VALUES
  -- Bali reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333301', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Absolutely breathtaking views! The infinity pool looking over the waves is pure magic. Alexandre and team were exceptionally attentive.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333301', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'One of the best stays we ever had in Bali. Peaceful, pristine, and the daily breakfast is out of this world.', 5, 5, 5, 5, 5, 4, NOW() - INTERVAL '28 days'),

  -- Kyoto reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333302', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Authentic Kyoto experience. The cedar bath smells heavenly and the location in Gion is unbeatable.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333302', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 5, 'Peaceful rock garden made morning coffees unforgettable. Very clean and thoughtfully equipped.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '40 days'),

  -- Da Nang reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333303', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'Super spacious penthouse right across My Khe beach! Super convenient for family vacation.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333303', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 4, 'Great location and speedy wifi. Balcony views are jaw-dropping during sunrise.', 5, 5, 4, 5, 5, 4, NOW() - INTERVAL '35 days'),

  -- Chiang Mai reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333304', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Sleeping under the stars inside the dome was romantic and magical. Highly recommend the campfire BBQ.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333304', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'Such a cozy nature getaway. Private plunge pool had warm water and cool fresh breeze.', 5, 5, 5, 5, 4, 5, NOW() - INTERVAL '25 days'),

  -- Swiss Alps reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333305', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Waking up to the Matterhorn out the window is an experience we will cherish forever. The sauna after skiing was luxury.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333305', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 5, 'Unmatched craftsmanship and comfort. Everything in this chalet is top tier.', 5, 5, 5, 5, 5, 4, NOW() - INTERVAL '45 days'),

  -- Santorini reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333306', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'The sunset terrace is the best in Oia, away from the loud crowds. Cave heated pool was divine!', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '22 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333306', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Five stars are not enough. Outstanding hospitality and pristine cleanliness.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '50 days'),

  -- Tuscany reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333307', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 5, 'Pure Tuscan dream! Made homemade pizzas in the stone oven and drank Chianti under the stars.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '14 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333307', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'The swimming pool overlooking the hills is stunning. Very comfortable beds and huge kitchen.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '30 days'),

  -- Paris reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333308', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Montmartre at its finest. Walkable to everything, stylish Parisian interior, loved the Eiffel view.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '9 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333308', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 4, 'Charming attic loft with lots of light. Spiral stairs take some effort with luggage, but well worth it!', 4, 5, 5, 5, 5, 4, NOW() - INTERVAL '32 days'),

  -- Aspen reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333309', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'Magnificent luxury cabin. The outdoor hot tub surrounded by pine woods in snowfall was legendary.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '11 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333309', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Great for hosting our group of 8. Kitchen has every tool imaginable.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '42 days'),

  -- Joshua Tree reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333310', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 5, 'Incredible stargazing experience. The Airstream is sleek, cool AC, and listening to records was a highlight.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '16 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333310', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Serene silence and beautiful desert flora. Outdoor tub is refreshing during hot afternoons.', 5, 5, 5, 5, 5, 4, NOW() - INTERVAL '37 days'),

  -- SoHo reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333311', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'World-class Manhattan loft. High ceilings, art pieces, and unbeatable Mercer street shops outside.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333311', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 5, 'Private roof terrace is unmatched for NYC. Direct elevator into loft gives complete privacy.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '26 days'),

  -- Vermont reviews
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333312', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 5, 'Peaceful pastoral retreat. Loved walking by the stream and having coffee on the screened porch.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '19 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333312', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 5, 'Autumn colors here are surreal. Very clean, charming vintage touches, modern heating.', 5, 5, 5, 5, 5, 5, NOW() - INTERVAL '44 days')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. BOOKINGS (5 Bookings mẫu đại diện confirmed, pending, cancelled)
-- Công thức: total_price = (price_per_night * total_nights) + cleaning_fee + service_fee
-- -----------------------------------------------------------------------------
INSERT INTO bookings (
  id, booking_code, listing_id, guest_id, check_in_date, check_out_date,
  total_nights, number_of_guests, base_price_total, cleaning_fee, service_fee, total_price,
  booking_status, payment_status, special_requests, created_at, updated_at
)
VALUES
  -- 1. Confirmed booking in Bali (3 nights: 285*3 = 855 + 45 + 35 = 935)
  (
    '55555555-5555-5555-5555-555555555501',
    'BK-BALI-88219',
    '33333333-3333-3333-3333-333333333301',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    CURRENT_DATE + INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '13 days',
    3, 2, 855.00, 45.00, 35.00, 935.00,
    'confirmed', 'paid', 'Late check-in around 8 PM due to flight.',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  ),

  -- 2. Pending booking in Kyoto (2 nights: 210*2 = 420 + 40 + 25 = 485)
  (
    '55555555-5555-5555-5555-555555555502',
    'BK-KYO-49120',
    '33333333-3333-3333-3333-333333333302',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    CURRENT_DATE + INTERVAL '25 days',
    CURRENT_DATE + INTERVAL '27 days',
    2, 2, 420.00, 40.00, 25.00, 485.00,
    'pending', 'pending', 'Requesting luggage drop-off before 2 PM.',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),

  -- 3. Confirmed booking in Paris (4 nights: 240*4 = 960 + 45 + 30 = 1035)
  (
    '55555555-5555-5555-5555-555555555503',
    'BK-PAR-73911',
    '33333333-3333-3333-3333-333333333308',
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    CURRENT_DATE + INTERVAL '40 days',
    CURRENT_DATE + INTERVAL '44 days',
    4, 2, 960.00, 45.00, 30.00, 1035.00,
    'confirmed', 'paid', 'Celebrating anniversary, bottle of champagne requested.',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
  ),

  -- 4. Cancelled booking in Swiss Alps (3 nights: 460*3 = 1380 + 65 + 50 = 1495)
  (
    '55555555-5555-5555-5555-555555555504',
    'BK-SWI-66482',
    '33333333-3333-3333-3333-333333333305',
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '7 days',
    3, 4, 1380.00, 65.00, 50.00, 1495.00,
    'cancelled', 'refunded', 'Cancelled due to flight change.',
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days'
  ),

  -- 5. Confirmed past booking in Da Nang (2 nights: 145*2 = 290 + 25 + 18 = 333)
  (
    '55555555-5555-5555-5555-555555555505',
    'BK-DAD-11029',
    '33333333-3333-3333-3333-333333333303',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '13 days',
    2, 2, 290.00, 25.00, 18.00, 333.00,
    'confirmed', 'paid', 'Quiet floor preferred.',
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. PAYMENTS (Bản ghi thanh toán tương ứng cho các bookings)
-- -----------------------------------------------------------------------------
INSERT INTO payments (
  id, booking_id, user_id, amount, currency, payment_method, payment_status,
  transaction_reference, mock_card_last4, paid_at, created_at
)
VALUES
  -- Payment for Bali booking
  (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555501',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    935.00, 'USD', 'credit_card', 'succeeded',
    'TXN-BALI-935-8812', '4242', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  ),
  -- Payment for Paris booking
  (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555503',
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    1035.00, 'USD', 'credit_card', 'succeeded',
    'TXN-PAR-1035-4421', '8888', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
  ),
  -- Payment for Swiss booking (Refunded)
  (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555504',
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    1495.00, 'USD', 'credit_card', 'refunded',
    'TXN-SWI-1495-7734', '1234', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
  ),
  -- Payment for Da Nang past booking
  (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555505',
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    333.00, 'USD', 'credit_card', 'succeeded',
    'TXN-DAD-333-0091', '4242', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
  )
ON CONFLICT DO NOTHING;

COMMIT;
