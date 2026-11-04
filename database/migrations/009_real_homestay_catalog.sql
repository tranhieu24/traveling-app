-- Adds 35 real-property room/listing candidates without touching the 15 legacy listings.
-- Review on staging after backup. These rows are intentionally inactive until approved
-- property photos are attached; never present an unreviewed official-site image as licensed media.
-- Prices, fees, coordinates and capacities are draft catalog values, not claims copied from
-- the source properties. An administrator must verify them before activating any listing.
BEGIN;

INSERT INTO public.categories (id, name, slug, icon_name, is_active, description)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Homestay',
  'homestay',
  'home',
  TRUE,
  'Chỗ ở do gia đình hoặc cơ sở địa phương vận hành.'
)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'host') THEN
    RAISE EXCEPTION 'Migration 009 requires at least one existing host profile';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'homestay') THEN
    RAISE EXCEPTION 'Migration 009 could not resolve the homestay category';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.listing_source_audits (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  source_page_url text NOT NULL CHECK (source_page_url ~ '^https://'),
  media_usage_status text NOT NULL
    CHECK (media_usage_status IN ('approved', 'needs_review', 'blocked')),
  context_evidence text NOT NULL,
  review_notes text,
  checked_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_source_audits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.listing_source_audits TO traveling_backend;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listing_source_audits'
      AND policyname = 'backend_read_access'
  ) THEN
    CREATE POLICY backend_read_access ON public.listing_source_audits
      FOR SELECT TO traveling_backend USING (true);
  END IF;
END $$;

WITH selected_host AS (
  SELECT id FROM public.users WHERE role = 'host' ORDER BY id LIMIT 1
), selected_category AS (
  SELECT id FROM public.categories WHERE slug = 'homestay' ORDER BY id LIMIT 1
), candidates(id, title, description, room_type, city, country, latitude, longitude,
             price, cleaning, service, max_guests, bedrooms, beds, bathrooms) AS (
  VALUES
  ('10000000-0000-0000-0000-000000000016'::uuid,'Sapa Hmong Bungalow 01','Hạng Bungalow 01 được công bố trên website chính thức của Sapa Hmong Bungalow. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Sa Pa','Vietnam',22.3363,103.8438,35,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000017'::uuid,'Sapa Hmong Bungalow 02','Hạng Bungalow 02 được công bố trên website chính thức của Sapa Hmong Bungalow. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Sa Pa','Vietnam',22.3363,103.8438,35,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000018'::uuid,'Sapa Hmong Premium Mountain View','Hạng Premium Mountain View được công bố trên website chính thức của Sapa Hmong Bungalow. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Sa Pa','Vietnam',22.3363,103.8438,45,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000019'::uuid,'Huế Mơ Homestay P101','Phòng P101 được công bố trong bộ ảnh phòng của Huế Mơ Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Huế','Vietnam',16.4637,107.5909,28,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000020'::uuid,'Huế Mơ Homestay P201','Phòng P201 được công bố trong bộ ảnh phòng của Huế Mơ Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Huế','Vietnam',16.4637,107.5909,30,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000021'::uuid,'An House Quy Nhơn Standard','Hạng Standard được công bố trên trang phòng chính thức của An House Quy Nhơn. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Quy Nhơn','Vietnam',13.7820,109.2190,26,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000022'::uuid,'An House Double Sea View','Hạng Double Sea View được công bố trên trang phòng chính thức của An House Quy Nhơn. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Quy Nhơn','Vietnam',13.7820,109.2190,34,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000023'::uuid,'An House Quad Sea View','Hạng Quad Sea View được công bố trên trang phòng chính thức của An House Quy Nhơn. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Quy Nhơn','Vietnam',13.7820,109.2190,45,5,5,4,1,2,1),
  ('10000000-0000-0000-0000-000000000024'::uuid,'Phu Quoc Homestay Private Room','Hạng Private Room được công bố trên website chính thức của Phu Quoc Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Phú Quốc','Vietnam',10.2899,103.9840,32,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000025'::uuid,'Phu Quoc Homestay Family Room','Hạng Family Room được công bố trên website chính thức của Phu Quoc Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Phú Quốc','Vietnam',10.2899,103.9840,48,6,6,4,1,2,1),
  ('10000000-0000-0000-0000-000000000026'::uuid,'Phu Quoc Homestay Long-term Room','Hạng Long-term Room được công bố trên website chính thức của Phu Quoc Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Phú Quốc','Vietnam',10.2899,103.9840,29,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000027'::uuid,'Mộc Châu Eco Garden Bungalow','Hạng Bungalow được công bố trên website chính thức của Mộc Châu Eco Garden. Ảnh đang chờ duyệt quyền sử dụng.','entire_place','Mộc Châu','Vietnam',20.8516,104.6220,40,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000028'::uuid,'Mộc Châu Eco Garden VIP Bungalow','Hạng VIP Bungalow được công bố trên website chính thức của Mộc Châu Eco Garden. Ảnh đang chờ duyệt quyền sử dụng.','entire_place','Mộc Châu','Vietnam',20.8516,104.6220,55,6,6,2,1,1,1),
  ('10000000-0000-0000-0000-000000000029'::uuid,'Mộc Châu Eco Garden Family Bungalow','Hạng Family Bungalow được công bố trên website chính thức của Mộc Châu Eco Garden. Ảnh đang chờ duyệt quyền sử dụng.','entire_place','Mộc Châu','Vietnam',20.8516,104.6220,65,7,7,4,2,2,1),
  ('10000000-0000-0000-0000-000000000030'::uuid,'Hang Múa Village Twin Room','Hạng Twin Room được công bố trên website chính thức của Hang Múa Village Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Ninh Bình','Vietnam',20.2506,105.9745,31,4,4,2,1,2,1),
  ('10000000-0000-0000-0000-000000000031'::uuid,'Hang Múa Village Triple Room','Hạng Triple Room được công bố trên website chính thức của Hang Múa Village Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Ninh Bình','Vietnam',20.2506,105.9745,38,5,5,3,1,2,1),
  ('10000000-0000-0000-0000-000000000032'::uuid,'Hang Múa Village Family Room','Hạng Family Room được công bố trên website chính thức của Hang Múa Village Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Ninh Bình','Vietnam',20.2506,105.9745,48,6,6,4,1,2,1),
  ('10000000-0000-0000-0000-000000000033'::uuid,'An An Homestay Double Garden View','Hạng Double Room Garden View được công bố trên website chính thức của An An Homestay Phong Nha. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Phong Nha','Vietnam',17.5950,106.2830,28,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000034'::uuid,'An An Homestay Double Mountain View','Hạng Double Room Mountain View được công bố trên website chính thức của An An Homestay Phong Nha. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Phong Nha','Vietnam',17.5950,106.2830,32,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000035'::uuid,'An An Homestay Family Room','Hạng Family Room được công bố trên website chính thức của An An Homestay Phong Nha. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Phong Nha','Vietnam',17.5950,106.2830,44,5,5,4,1,2,1),
  ('10000000-0000-0000-0000-000000000036'::uuid,'An Homestay Cát Bà Private Room 1','Phòng riêng được công bố trên trang Rooms chính thức của An Homestay Cát Bà. Ảnh đang chờ trích URL ổn định và duyệt quyền sử dụng.','private_room','Cát Bà','Vietnam',20.7270,107.0480,30,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000037'::uuid,'An Homestay Cát Bà Private Room 2','Phòng riêng được công bố trên trang Rooms chính thức của An Homestay Cát Bà. Ảnh đang chờ trích URL ổn định và duyệt quyền sử dụng.','private_room','Cát Bà','Vietnam',20.7270,107.0480,34,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000038'::uuid,'Đạ Lạch Homestay Nguyên Căn','Chỗ ở nguyên căn được công bố trên website chính thức của Đạ Lạch Farmstay. Ảnh đang chờ trích URL ổn định và duyệt quyền sử dụng.','entire_place','Đà Lạt','Vietnam',11.9404,108.4583,110,15,12,12,6,6,6),
  ('10000000-0000-0000-0000-000000000039'::uuid,'Feliz Dalat Homestay','Chỗ ở được công bố trong gallery chính thức của Feliz Dalat Homestay. Ảnh đang chờ trích URL ổn định và duyệt quyền sử dụng.','private_room','Đà Lạt','Vietnam',11.9404,108.4583,33,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000040'::uuid,'Phoenix Homestay Hội An Superior','Hạng Superior được công bố trên website chính thức của Phoenix Homestay Hội An. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Hội An','Vietnam',15.8801,108.3380,30,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000041'::uuid,'Phoenix Homestay Hội An Deluxe','Hạng Deluxe được công bố trên website chính thức của Phoenix Homestay Hội An. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Hội An','Vietnam',15.8801,108.3380,36,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000042'::uuid,'Ha Giang Historic House Double Room','Hạng Double Room được công bố trên website chính thức của Ha Giang Historic House. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Hà Giang','Vietnam',22.8233,104.9836,29,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000043'::uuid,'Ha Giang Historic House Twin Room','Hạng Twin Room được công bố trên website chính thức của Ha Giang Historic House. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Hà Giang','Vietnam',22.8233,104.9836,31,4,4,2,1,2,1),
  ('10000000-0000-0000-0000-000000000044'::uuid,'Côn Đảo House Double Room','Hạng Double Room được công bố trên trang thông tin du lịch Côn Đảo về Côn Đảo House. Ảnh đang chờ xác nhận quyền từ cơ sở hoặc đơn vị chủ quản.','private_room','Côn Đảo','Vietnam',8.6864,106.6082,38,5,5,2,1,1,1),
  ('10000000-0000-0000-0000-000000000045'::uuid,'Côn Đảo House Family Room','Hạng Family Room được công bố trên trang thông tin du lịch Côn Đảo về Côn Đảo House. Ảnh đang chờ xác nhận quyền từ cơ sở hoặc đơn vị chủ quản.','private_room','Côn Đảo','Vietnam',8.6864,106.6082,52,6,6,4,1,2,1),
  ('10000000-0000-0000-0000-000000000046'::uuid,'Meadow Mai Châu Double Room','Hạng Double Room được công bố trên website chính thức của Meadow Mai Châu Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Mai Châu','Vietnam',20.6630,105.0550,27,4,4,2,1,1,1),
  ('10000000-0000-0000-0000-000000000047'::uuid,'Meadow Mai Châu Family Room','Hạng Family Room được công bố trên website chính thức của Meadow Mai Châu Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Mai Châu','Vietnam',20.6630,105.0550,42,5,5,4,1,2,1),
  ('10000000-0000-0000-0000-000000000048'::uuid,'VungTau Stay Studio The Sóng','Hạng Studio The Sóng được công bố trên website VungTau Stay. Cần xác minh thêm ảnh không phải fixture trước khi kích hoạt.','entire_place','Vũng Tàu','Vietnam',10.4114,107.1362,49,7,6,3,1,2,1),
  ('10000000-0000-0000-0000-000000000049'::uuid,'VANA Homestay Misty Trail','Hạng Misty Trail được công bố trên website chính thức của VANA Homestay. Ảnh đang chờ duyệt quyền sử dụng.','private_room','Chiang Mai','Thailand',18.7883,98.9853,45,6,6,2,1,1,1),
  ('10000000-0000-0000-0000-000000000050'::uuid,'Middle House Bali Premier Garden Room','Hạng Premier Garden Room được công bố trên website chính thức của Middle House Bali. Ảnh đang chờ trích URL ổn định và duyệt quyền sử dụng.','private_room','Bali','Indonesia',-8.4095,115.1889,58,8,7,2,1,1,1)
)
INSERT INTO public.listings (
  id, host_id, category_id, title, description, property_type, room_type, address,
  city, country, region, latitude, longitude, price_per_night, cleaning_fee,
  service_fee, max_guests, bedrooms, beds, bathrooms, is_active
)
SELECT c.id, h.id, cat.id, c.title, c.description, 'Homestay', c.room_type,
       NULL, c.city, c.country, 'Asia', c.latitude, c.longitude, c.price,
       c.cleaning, c.service, c.max_guests, c.bedrooms, c.beds, c.bathrooms, FALSE
FROM candidates c
CROSS JOIN selected_host h
CROSS JOIN selected_category cat
ON CONFLICT (id) DO NOTHING;

WITH sources(listing_id, source_page_url, media_usage_status, context_evidence, review_notes) AS (
  VALUES
  ('10000000-0000-0000-0000-000000000016'::uuid,'https://sapahmongbungalow.com/','needs_review','Website chính thức liên kết Bungalow 01 với gallery của cơ sở.','Website ghi bảo lưu bản quyền.'),
  ('10000000-0000-0000-0000-000000000017'::uuid,'https://sapahmongbungalow.com/','needs_review','Website chính thức liên kết Bungalow 02 với gallery của cơ sở.','Website ghi bảo lưu bản quyền.'),
  ('10000000-0000-0000-0000-000000000018'::uuid,'https://sapahmongbungalow.com/','needs_review','Website chính thức liên kết Premium Mountain View với gallery của cơ sở.','Website ghi bảo lưu bản quyền.'),
  ('10000000-0000-0000-0000-000000000019'::uuid,'https://huemohomestay.com/en/','needs_review','Gallery chính thức đặt tên ảnh theo mã phòng P101.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000020'::uuid,'https://huemohomestay.com/en/','needs_review','Gallery chính thức đặt tên ảnh theo mã phòng P201.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000021'::uuid,'https://anhousequynhon.vn/index.php/room/','needs_review','Trang phòng chính thức gắn ảnh với hạng Standard.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000022'::uuid,'https://anhousequynhon.vn/index.php/room/','needs_review','Trang phòng chính thức gắn ảnh với hạng Double Sea View.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000023'::uuid,'https://anhousequynhon.vn/index.php/room/','needs_review','Trang phòng chính thức gắn ảnh với hạng Quad Sea View.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000024'::uuid,'https://phuquoc-homestay.com/rooms/','needs_review','Trang Rooms chính thức công bố Private Room và ảnh cùng tên.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000025'::uuid,'https://phuquoc-homestay.com/rooms/','needs_review','Trang Rooms chính thức công bố Family Room và ảnh cùng tên.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000026'::uuid,'https://phuquoc-homestay.com/rooms/','needs_review','Trang Rooms chính thức công bố Long-term Room và ảnh cùng tên.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000027'::uuid,'https://mocchauecogarden.com/en/','needs_review','Trang chính thức công bố hạng Bungalow và media cùng domain.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000028'::uuid,'https://mocchauecogarden.com/en/','needs_review','Trang chính thức công bố hạng VIP Bungalow và media cùng domain.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000029'::uuid,'https://mocchauecogarden.com/en/','needs_review','Trang chính thức công bố hạng Family Bungalow và media cùng domain.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000030'::uuid,'https://www.hangmuavillagehomestay.com/en','needs_review','Trang chính thức hiển thị ảnh cạnh hạng Twin Room.','URL ảnh Google Sites cần kiểm tra độ ổn định và quyền.'),
  ('10000000-0000-0000-0000-000000000031'::uuid,'https://www.hangmuavillagehomestay.com/en','needs_review','Trang chính thức hiển thị ảnh cạnh hạng Triple Room.','URL ảnh Google Sites cần kiểm tra độ ổn định và quyền.'),
  ('10000000-0000-0000-0000-000000000032'::uuid,'https://www.hangmuavillagehomestay.com/en','needs_review','Trang chính thức hiển thị ảnh cạnh hạng Family Room.','URL ảnh Google Sites cần kiểm tra độ ổn định và quyền.'),
  ('10000000-0000-0000-0000-000000000033'::uuid,'https://ananhomestayphongnha.com/','needs_review','Tên file ảnh chính thức chứa đúng Double Room Garden View.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000034'::uuid,'https://ananhomestayphongnha.com/','needs_review','Tên file ảnh chính thức chứa đúng Double Room Mountain View.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000035'::uuid,'https://ananhomestayphongnha.com/','needs_review','Website chính thức công bố hạng Family Room.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000036'::uuid,'https://anhomestay-catba.com/rooms/','blocked','Trang Rooms chính thức có gallery của property.','Chưa trích được URL ảnh ổn định.'),
  ('10000000-0000-0000-0000-000000000037'::uuid,'https://anhomestay-catba.com/rooms/','blocked','Trang Rooms chính thức có gallery của property.','Chưa trích được URL ảnh ổn định.'),
  ('10000000-0000-0000-0000-000000000038'::uuid,'https://homestay.dalachfarmstay.vn/','blocked','Website chính thức mô tả homestay nguyên căn và gallery.','Ảnh được tải qua script; chưa có URL gốc ổn định.'),
  ('10000000-0000-0000-0000-000000000039'::uuid,'https://www.felizdalathomestay.com/gallery','blocked','Gallery chính thức xác nhận property.','Chưa trích được URL ảnh gốc ổn định.'),
  ('10000000-0000-0000-0000-000000000040'::uuid,'https://www.phoenixhomestayhoian.com/','needs_review','Website chính thức có ảnh Superior tại images/sup.jpg.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000041'::uuid,'https://www.phoenixhomestayhoian.com/','needs_review','Website chính thức có ảnh Deluxe tại images/deluxe.jpg.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000042'::uuid,'https://hagianghistorichouse.com/stay','needs_review','Trang Stay chính thức gắn hạng Double với media property.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000043'::uuid,'https://hagianghistorichouse.com/stay','needs_review','Trang Stay chính thức gắn hạng Twin với media property.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000044'::uuid,'https://condao.com.vn/vi/store/dia-diem-luu-tru/Con-Dao-House.html','needs_review','Trang du lịch chủ quản có ảnh và mô tả đúng Côn Đảo House.','Cần xác nhận quyền từ cơ sở hoặc đơn vị chủ quản.'),
  ('10000000-0000-0000-0000-000000000045'::uuid,'https://condao.com.vn/vi/store/dia-diem-luu-tru/Con-Dao-House.html','needs_review','Trang du lịch chủ quản có ảnh và mô tả đúng Côn Đảo House.','Cần xác nhận quyền từ cơ sở hoặc đơn vị chủ quản.'),
  ('10000000-0000-0000-0000-000000000046'::uuid,'https://meadowmaichauhomestay.com/','needs_review','Website chính thức và media cùng domain xác nhận property.','Cần xác nhận mapping ảnh theo hạng và quyền sử dụng.'),
  ('10000000-0000-0000-0000-000000000047'::uuid,'https://meadowmaichauhomestay.com/','needs_review','Website chính thức và media cùng domain xác nhận property.','Cần xác nhận mapping ảnh theo hạng và quyền sử dụng.'),
  ('10000000-0000-0000-0000-000000000048'::uuid,'https://vungtaustay.vn/','needs_review','Trang cơ sở công bố Studio The Sóng và media cùng domain.','Cần xác minh file ảnh không phải fixture minh họa.'),
  ('10000000-0000-0000-0000-000000000049'::uuid,'https://vanahomestay.com/','needs_review','Trang Rooms chính thức công bố Misty Trail và media cùng domain.','Chưa có giấy phép tái sử dụng rõ ràng.'),
  ('10000000-0000-0000-0000-000000000050'::uuid,'https://middlehouse.id/','blocked','Website chính thức công bố Premier Garden Room.','Chưa trích được URL ảnh ổn định.')
)
INSERT INTO public.listing_source_audits (
  listing_id, source_page_url, media_usage_status, context_evidence,
  review_notes, checked_at, updated_at
)
SELECT s.listing_id, s.source_page_url, s.media_usage_status, s.context_evidence,
       s.review_notes, TIMESTAMPTZ '2026-11-04 00:00:00+07', now()
FROM sources s
JOIN public.listings l ON l.id = s.listing_id
ON CONFLICT (listing_id) DO UPDATE SET
  source_page_url = EXCLUDED.source_page_url,
  media_usage_status = EXCLUDED.media_usage_status,
  context_evidence = EXCLUDED.context_evidence,
  review_notes = EXCLUDED.review_notes,
  checked_at = EXCLUDED.checked_at,
  updated_at = now();

COMMIT;

-- Verification after applying on staging:
-- SELECT count(*) FROM public.listings WHERE id BETWEEN
--   '10000000-0000-0000-0000-000000000016' AND
--   '10000000-0000-0000-0000-000000000050'; -- expected 35
-- SELECT media_usage_status, count(*) FROM public.listing_source_audits GROUP BY 1;
-- Rollback (only if none of these inactive candidates has acquired dependent data):
-- DELETE FROM public.listings WHERE id BETWEEN ...0016 AND ...0050;
-- DROP TABLE public.listing_source_audits only after exporting provenance and checking other rows.
