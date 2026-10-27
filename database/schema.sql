-- =============================================================================
-- TRAVELING APP - SCHEMA (PostgreSQL 15+ / Supabase)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- cho exclusion constraint

-- ---------- 1. USERS (profile gắn với Supabase Auth) ----------
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    avatar_url  TEXT,
    phone_number VARCHAR(30),
    role        VARCHAR(20) NOT NULL DEFAULT 'guest'
                CHECK (role IN ('guest', 'host', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 2. CATEGORIES ----------
CREATE TABLE public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    slug        VARCHAR(50) NOT NULL UNIQUE,
    icon_name   VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 3. AMENITIES ----------
CREATE TABLE public.amenities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    icon_name   VARCHAR(50) NOT NULL,
    group_name  VARCHAR(50) NOT NULL DEFAULT 'Facilities',  -- Facilities / Cleaning & laundry / Bathroom
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 4. LISTINGS ----------
CREATE TABLE public.listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    category_id     UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    property_type   VARCHAR(50)  NOT NULL DEFAULT 'Apartment',   -- mô tả: Apartment, Villa, Treehouse...
    room_type       VARCHAR(20)  NOT NULL DEFAULT 'entire_place'
                    CHECK (room_type IN ('entire_place', 'private_room', 'dormitory')),
    address         VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    region          VARCHAR(50)  NOT NULL,                       -- Asia, Europe... (bộ lọc vùng)
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    price_per_night NUMERIC(12,2) NOT NULL CHECK (price_per_night >= 0),
    cleaning_fee    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
    service_fee     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    max_guests      INT NOT NULL DEFAULT 1 CHECK (max_guests > 0),
    bedrooms        INT NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
    beds            INT NOT NULL DEFAULT 1 CHECK (beds >= 0),
    bathrooms       INT NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
    check_in_time   TIME NOT NULL DEFAULT '14:00',
    check_out_time  TIME NOT NULL DEFAULT '12:00',
    rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
    review_count    INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 5. LISTING_PHOTOS ----------
CREATE TABLE public.listing_photos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id    UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    photo_url     TEXT NOT NULL,
    caption       TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_cover      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Mỗi listing tối đa một ảnh bìa
CREATE UNIQUE INDEX uq_listing_one_cover ON public.listing_photos (listing_id) WHERE is_cover;

-- ---------- 6. LISTING_AMENITIES ----------
CREATE TABLE public.listing_amenities (
    listing_id UUID NOT NULL REFERENCES public.listings(id)  ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (listing_id, amenity_id)
);

-- ---------- 7. FAVORITES ----------
CREATE TABLE public.favorites (
    user_id    UUID NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

-- ---------- 8. BOOKINGS ----------
CREATE TABLE public.bookings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code     VARCHAR(20) NOT NULL UNIQUE,
    guest_id         UUID NOT NULL REFERENCES public.users(id)    ON DELETE RESTRICT,
    listing_id       UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
    check_in_date    DATE NOT NULL,
    check_out_date   DATE NOT NULL,
    total_nights     INT GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    number_of_guests INT NOT NULL CHECK (number_of_guests > 0),
    -- snapshot giá tại thời điểm đặt
    price_per_night  NUMERIC(12,2) NOT NULL CHECK (price_per_night >= 0),
    cleaning_fee     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
    service_fee      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    total_price      NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    booking_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (booking_status IN ('pending','confirmed','cancelled','completed')),
    special_requests TEXT,
    cancelled_at     TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_total_price CHECK (
        total_price = price_per_night * (check_out_date - check_in_date) + cleaning_fee + service_fee
    ),
    -- chống đặt trùng ngày (chỉ tính booking còn hiệu lực)
    CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
        listing_id WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
    ) WHERE (booking_status IN ('pending','confirmed'))
);

-- ---------- 9. PAYMENTS ----------
CREATE TABLE public.payments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id            UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
    user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount                NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency              CHAR(3) NOT NULL DEFAULT 'USD',
    payment_method        VARCHAR(50) NOT NULL DEFAULT 'mock_credit_card',
    payment_status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','succeeded','failed','refunded')),
    transaction_reference VARCHAR(100) UNIQUE,
    mock_card_last4       CHAR(4),
    paid_at               TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 10. REVIEWS ----------
CREATE TABLE public.reviews (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
    rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reviews_user_listing UNIQUE (user_id, listing_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_listings_category_region ON public.listings (category_id, region);
CREATE INDEX idx_listings_price           ON public.listings (price_per_night);
CREATE INDEX idx_listings_rating          ON public.listings (rating_avg DESC);
CREATE INDEX idx_listings_room_type       ON public.listings (room_type);
CREATE INDEX idx_listings_host            ON public.listings (host_id);
CREATE INDEX idx_photos_listing_order     ON public.listing_photos (listing_id, display_order);
CREATE INDEX idx_listing_amenities_rev    ON public.listing_amenities (amenity_id);
CREATE INDEX idx_reviews_listing          ON public.reviews (listing_id, created_at DESC);
CREATE INDEX idx_bookings_guest           ON public.bookings (guest_id, created_at DESC);
CREATE INDEX idx_favorites_listing        ON public.favorites (listing_id);

-- =============================================================================
-- TRIGGERS & FUNCTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON public.users    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cập nhật rating_avg và review_count
CREATE OR REPLACE FUNCTION public.update_listing_rating_stats()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    target UUID;
BEGIN
    target := COALESCE(NEW.listing_id, OLD.listing_id);
    UPDATE public.listings l
    SET rating_avg   = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE listing_id = target), 0),
        review_count = (SELECT COUNT(*) FROM public.reviews WHERE listing_id = target)
    WHERE l.id = target;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_rating_after_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_listing_rating_stats();

-- Tự tạo profile khi đăng ký Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();