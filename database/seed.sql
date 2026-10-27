-- =============================================================================
-- TRAVELING APP - SEED DATA (chạy MỘT LẦN, sau 001_init.sql và 002_rls.sql)
-- Mật khẩu mẫu của mọi tài khoản: Password123!
-- =============================================================================

-- ---------- 1. TÀI KHOẢN AUTH (trigger handle_new_user tự tạo public.users) ----------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
SELECT
  '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
  u.email, extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  NOW(), NOW(), '', '', '', ''
FROM (VALUES
  ('a0000000-0000-0000-0000-000000000001', 'host1@travelingapp.com',  'Alexandre Dubois'),
  ('a0000000-0000-0000-0000-000000000002', 'host2@travelingapp.com',  'Kenji Takahashi'),
  ('a0000000-0000-0000-0000-000000000003', 'host3@travelingapp.com',  'Sarah Jenkins'),
  ('b0000000-0000-0000-0000-000000000001', 'guest1@travelingapp.com', 'Minh Nguyen'),
  ('b0000000-0000-0000-0000-000000000002', 'guest2@travelingapp.com', 'Emma Watson'),
  ('b0000000-0000-0000-0000-000000000003', 'guest3@travelingapp.com', 'Liam O''Connor')
) AS u(id, email, full_name);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', NOW(), NOW(), NOW()
FROM auth.users
WHERE email LIKE '%@travelingapp.com';

-- Cập nhật role và số điện thoại cho public.users
UPDATE public.users SET role = 'host'
WHERE email IN ('host1@travelingapp.com','host2@travelingapp.com','host3@travelingapp.com');

UPDATE public.users u SET phone_number = v.phone
FROM (VALUES
  ('host1@travelingapp.com',  '+33612345678'),
  ('host2@travelingapp.com',  '+819012345678'),
  ('host3@travelingapp.com',  '+14155552671'),
  ('guest1@travelingapp.com', '+84912345678'),
  ('guest2@travelingapp.com', '+447911123456'),
  ('guest3@travelingapp.com', '+353871234567')
) AS v(email, phone)
WHERE u.email = v.email;

-- ---------- 2. CATEGORIES ----------
INSERT INTO public.categories (name, slug, icon_name) VALUES
  ('Beach',    'beach',    'palm-tree'),
  ('Mountain', 'mountain', 'mountain'),
  ('Camping',  'camping',  'tent');

-- ---------- 3. AMENITIES (một tên chuẩn dùng chung cho filter và chi tiết) ----------
INSERT INTO public.amenities (name, icon_name, group_name) VALUES
  ('Wifi',             'wifi',            'Facilities'),
  ('Kitchen',          'utensils',        'Facilities'),
  ('Pool',             'waves',           'Facilities'),
  ('Gym',              'dumbbell',        'Facilities'),
  ('Garden',           'flower',          'Facilities'),
  ('Outdoor space',    'trees',           'Facilities'),
  ('Air conditioning', 'snowflake',       'Facilities'),
  ('Washer',           'washing-machine', 'Cleaning & laundry'),
  ('Dryer',            'wind',            'Cleaning & laundry'),
  ('Iron',             'shirt',           'Cleaning & laundry'),
  ('Bathtub',          'bath',            'Bathroom'),
  ('Hair dryer',       'hair-dryer',      'Bathroom');

-- ---------- 4. LISTINGS (15) ----------
INSERT INTO public.listings (
  id, host_id, category_id, title, description, property_type, room_type, address,
  city, country, region, latitude, longitude,
  price_per_night, cleaning_fee, service_fee, max_guests, bedrooms, beds, bathrooms
)
SELECT v.id::uuid, h.id, c.id, v.title, v.description, v.property_type, v.room_type, v.address,
       v.city, v.country, v.region, v.lat::numeric, v.lng::numeric,
       v.price::numeric, v.cleaning::numeric, v.service::numeric,
       v.max_guests::int, v.bedrooms::int, v.beds::int, v.bathrooms::int
FROM (VALUES
 -- BEACH
 ('10000000-0000-0000-0000-000000000001','host2@travelingapp.com','beach','Balian Treehouse',
  'A stunning Balinese treehouse just minutes from the beach, surrounded by palms and a private pool.',
  'Treehouse','entire_place','Jl. Pantai Balian','Bali','Indonesia','Asia',-8.4800000,114.9900000,20,5,5,2,1,1,1),
 ('10000000-0000-0000-0000-000000000002','host2@travelingapp.com','beach','Seaside Apartment My Khe',
  'Bright apartment a short walk from My Khe beach with a sea-view balcony.',
  'Apartment','entire_place','Vo Nguyen Giap Street','Da Nang','Vietnam','Asia',16.0544000,108.2478000,28,6,4,3,1,2,1),
 ('10000000-0000-0000-0000-000000000003','host1@travelingapp.com','beach','Omaha Beach House',
  'Traditional Normandy house steps from the historic Omaha Beach, perfect for families.',
  'House','entire_place','12 Rue de la Plage','Normandy','France','Europe',49.3700000,-0.8800000,120,40,25,6,3,4,2),
 ('10000000-0000-0000-0000-000000000004','host1@travelingapp.com','beach','Cascais Ocean Studio',
  'Modern studio with ocean views in the heart of Cascais, close to cafes and surf spots.',
  'Studio','entire_place','Rua Frederico Arouca','Cascais','Portugal','Europe',38.6979000,-9.4215000,85,25,15,2,1,1,1),
 ('10000000-0000-0000-0000-000000000005','host3@travelingapp.com','beach','Malibu Beach Bungalow',
  'Sun-drenched bungalow with a private deck, a short stroll to the sand.',
  'Bungalow','entire_place','Pacific Coast Highway','Malibu','USA','North America',34.0259000,-118.7798000,210,60,40,4,2,2,2),
 ('10000000-0000-0000-0000-000000000006','host2@travelingapp.com','beach','Phuket Pool Villa',
  'Private pool villa with tropical garden, five minutes from Kata beach.',
  'Villa','entire_place','Kata Road','Phuket','Thailand','Asia',7.8200000,98.2990000,95,30,20,5,2,3,2),
 -- MOUNTAIN
 ('10000000-0000-0000-0000-000000000007','host1@travelingapp.com','mountain','Alpine Chalet Chamonix',
  'Cozy wooden chalet with fireplace and views of Mont Blanc.',
  'Chalet','entire_place','45 Route des Pelerins','Chamonix','France','Europe',45.9237000,6.8694000,180,50,30,6,3,4,2),
 ('10000000-0000-0000-0000-000000000008','host2@travelingapp.com','mountain','Sapa Valley Homestay',
  'Private room in a family homestay overlooking terraced rice fields.',
  'Homestay','private_room','Ta Van Village','Sapa','Vietnam','Asia',22.3363000,103.8438000,35,5,5,2,1,1,1),
 ('10000000-0000-0000-0000-000000000009','host3@travelingapp.com','mountain','Aspen Log Cabin',
  'Rustic luxury log cabin with hot tub, minutes from the ski lifts.',
  'Cabin','entire_place','200 Aspen Mountain Road','Aspen','USA','North America',39.1911000,-106.8175000,240,70,45,6,3,4,3),
 ('10000000-0000-0000-0000-000000000010','host2@travelingapp.com','mountain','Hakuba Ski Lodge',
  'Traditional Japanese lodge near Hakuba slopes with tatami rooms and onsen access.',
  'Lodge','entire_place','Hakuba Village','Hakuba','Japan','Asia',36.6980000,137.8620000,150,40,25,5,2,4,1),
 ('10000000-0000-0000-0000-000000000011','host1@travelingapp.com','mountain','Dolomites Mountain Loft',
  'Bright loft apartment with panoramic Dolomites views and a sunny terrace.',
  'Loft','entire_place','Via Roma 8','Cortina d''Ampezzo','Italy','Europe',46.5405000,12.1357000,130,35,20,4,2,2,1),
 -- CAMPING
 ('10000000-0000-0000-0000-000000000012','host3@travelingapp.com','camping','Yosemite Glamping Tent',
  'Canvas glamping tent with real beds, minutes from Yosemite Valley.',
  'Tent','entire_place','Yosemite Valley Rd','Yosemite','USA','North America',37.8651000,-119.5383000,90,20,15,4,1,2,1),
 ('10000000-0000-0000-0000-000000000013','host2@travelingapp.com','camping','Da Lat Pine Forest Camp',
  'Shared camp dorm among pine trees with bonfire evenings and hot showers.',
  'Camp','dormitory','Tuyen Lam Lake','Da Lat','Vietnam','Asia',11.9404000,108.4583000,25,0,3,8,1,8,2),
 ('10000000-0000-0000-0000-000000000014','host1@travelingapp.com','camping','Scottish Highlands Pod',
  'Insulated wooden pod by a loch, ideal for stargazing and hiking.',
  'Pod','entire_place','Loch Ness Road','Inverness','United Kingdom','Europe',57.4778000,-4.2247000,70,15,10,2,1,1,1),
 ('10000000-0000-0000-0000-000000000015','host3@travelingapp.com','camping','Moab Desert Dome',
  'Geodesic dome under the desert stars, near Arches National Park.',
  'Dome','entire_place','Arches Scenic Drive','Moab','USA','North America',38.5733000,-109.5498000,110,25,20,2,1,1,1)
) AS v(id, host_email, cat_slug, title, description, property_type, room_type, address,
       city, country, region, lat, lng, price, cleaning, service,
       max_guests, bedrooms, beds, bathrooms)
JOIN public.users      h ON h.email = v.host_email
JOIN public.categories c ON c.slug  = v.cat_slug;

-- ---------- 5. ẢNH (3 ảnh/listing, ảnh đầu là cover; ảnh tạm, thay bằng Supabase Storage sau) ----------
INSERT INTO public.listing_photos (listing_id, photo_url, caption, display_order, is_cover)
SELECT l.id,
       'https://picsum.photos/seed/' || l.id::text || '-' || n || '/1200/800',
       l.title || ' - photo ' || n,
       n,
       (n = 1)
FROM public.listings l
CROSS JOIN generate_series(1, 3) AS n;

-- ---------- 6. TIỆN NGHI CỦA TỪNG LISTING (xác định, ai cũng có Wifi; Pool chỉ ở Beach) ----------
INSERT INTO public.listing_amenities (listing_id, amenity_id)
SELECT l.id, a.id
FROM (SELECT id, category_id, row_number() OVER (ORDER BY id) AS ln FROM public.listings) l
JOIN public.categories c ON c.id = l.category_id
CROSS JOIN (SELECT id, name, row_number() OVER (ORDER BY name) AS an FROM public.amenities) a
WHERE a.name = 'Wifi'
   OR (a.name = 'Pool' AND c.slug = 'beach')
   OR (a.name <> 'Pool' AND (l.ln + a.an) % 2 = 0);

-- ---------- 7. REVIEWS (trigger tự cập nhật rating_avg và review_count) ----------
INSERT INTO public.reviews (listing_id, user_id, rating, comment)
SELECT l.id, g.id, r.rating,
  CASE r.rating
    WHEN 5 THEN (ARRAY[
      'Absolutely stunning place, the photos do not do it justice.',
      'We loved staying here. Clean, comfortable and exactly as described.',
      'Perfect for our trip. The host was friendly and very helpful.'
    ])[1 + ((l.ln + g.gn) % 3)::int]
    WHEN 4 THEN (ARRAY[
      'Great location and good value. A few small things could be improved.',
      'Very nice stay overall, we would happily come back.',
      'Comfortable and clean, with all the amenities we needed.'
    ])[1 + ((l.ln + g.gn) % 3)::int]
    ELSE (ARRAY[
      'The location was convenient but the cleanliness was a bit disappointing.',
      'Decent for the price, though it did not fully match the description.'
    ])[1 + ((l.ln + g.gn) % 2)::int]
  END
FROM (SELECT id, row_number() OVER (ORDER BY id) AS ln FROM public.listings) l
CROSS JOIN (SELECT id, row_number() OVER (ORDER BY email) AS gn
            FROM public.users WHERE role = 'guest') g
CROSS JOIN LATERAL (
  SELECT CASE WHEN (l.ln + g.gn) % 5 = 0 THEN 3
              WHEN (l.ln + g.gn) % 2 = 0 THEN 4
              ELSE 5 END AS rating
) r;

-- ---------- 8. FAVORITES ----------
INSERT INTO public.favorites (user_id, listing_id)
SELECT u.id, f.listing_id::uuid
FROM (VALUES
  ('guest1@travelingapp.com','10000000-0000-0000-0000-000000000001'),
  ('guest1@travelingapp.com','10000000-0000-0000-0000-000000000002'),
  ('guest1@travelingapp.com','10000000-0000-0000-0000-000000000005'),
  ('guest2@travelingapp.com','10000000-0000-0000-0000-000000000003'),
  ('guest2@travelingapp.com','10000000-0000-0000-0000-000000000007'),
  ('guest3@travelingapp.com','10000000-0000-0000-0000-000000000012')
) AS f(email, listing_id)
JOIN public.users u ON u.email = f.email;

-- ---------- 9. BOOKINGS (tổng tiền tính đúng công thức: giá x đêm + phí) ----------
INSERT INTO public.bookings (
  booking_code, guest_id, listing_id, check_in_date, check_out_date, number_of_guests,
  price_per_night, cleaning_fee, service_fee, total_price, booking_status, cancelled_at, cancellation_reason
)
SELECT v.code, u.id, l.id, v.cin::date, v.cout::date, v.guests::int,
       l.price_per_night, l.cleaning_fee, l.service_fee,
       l.price_per_night * (v.cout::date - v.cin::date) + l.cleaning_fee + l.service_fee,
       v.status,
       CASE WHEN v.status = 'cancelled' THEN NOW() END,
       CASE WHEN v.status = 'cancelled' THEN 'Change of plans' END
FROM (VALUES
  ('TRV-2026-0001','guest1@travelingapp.com','10000000-0000-0000-0000-000000000001','2026-08-10','2026-08-13',2,'completed'),
  ('TRV-2026-0002','guest2@travelingapp.com','10000000-0000-0000-0000-000000000005','2026-12-20','2026-12-24',2,'confirmed'),
  ('TRV-2026-0003','guest3@travelingapp.com','10000000-0000-0000-0000-000000000003','2026-11-05','2026-11-08',4,'cancelled'),
  ('TRV-2026-0004','guest1@travelingapp.com','10000000-0000-0000-0000-000000000007','2026-12-01','2026-12-05',2,'confirmed')
) AS v(code, email, listing_id, cin, cout, guests, status)
JOIN public.users    u ON u.email = v.email
JOIN public.listings l ON l.id = v.listing_id::uuid;

-- ---------- 10. PAYMENTS ----------
INSERT INTO public.payments (
  booking_id, user_id, amount, currency, payment_method, payment_status,
  transaction_reference, mock_card_last4, paid_at
)
SELECT b.id, b.guest_id, b.total_price, 'USD', 'mock_credit_card',
       CASE b.booking_status WHEN 'cancelled' THEN 'refunded' ELSE 'succeeded' END,
       '0000007269' || right(b.booking_code, 4),
       '4242',
       NOW()
FROM public.bookings b;