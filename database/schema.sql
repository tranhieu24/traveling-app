-- ==============================================================================
-- TRAVELING APP - DATABASE SCHEMA DEFINITION (DDL)
-- Target: PostgreSQL 15+ / Supabase Cloud
-- Tables: 10 tables fully compatible with seed.sql and Backend API
-- ==============================================================================

-- Bật extension pgcrypto hoặc uuid-ossp để sinh UUID ngẫu nhiên
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Xóa các bảng cũ theo thứ tự ràng buộc khóa ngoại (nếu muốn làm sạch tạo lại từ đầu)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS listing_amenities CASCADE;
DROP TABLE IF EXISTS listing_photos CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS
-- Lưu thông tin tài khoản người dùng (Guest, Host, Admin)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone_number VARCHAR(50),
    role VARCHAR(50) DEFAULT 'guest' CHECK (role IN ('guest', 'host', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES
-- Danh mục phân loại chỗ ở (Beach, Mountain, Camping, Countryside, Iconic Cities)
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. AMENITIES
-- Danh mục các tiện nghi (Wifi, Kitchen, Pool, Free parking, ...)
-- -----------------------------------------------------------------------------
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    category VARCHAR(100) DEFAULT 'Essentials',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. LISTINGS
-- Thông tin chi tiết địa điểm lưu trú / phòng nghỉ
-- -----------------------------------------------------------------------------
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    property_type VARCHAR(100) DEFAULT 'Apartment',
    room_type VARCHAR(100) DEFAULT 'Entire place',
    address TEXT,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    price_per_night NUMERIC(12, 2) NOT NULL,
    cleaning_fee NUMERIC(12, 2) DEFAULT 0.00,
    service_fee NUMERIC(12, 2) DEFAULT 0.00,
    max_guests INTEGER DEFAULT 1,
    bedrooms INTEGER DEFAULT 1,
    beds INTEGER DEFAULT 1,
    bathrooms INTEGER DEFAULT 1,
    rating_avg NUMERIC(3, 2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. LISTING PHOTOS
-- Bộ sưu tập ảnh của từng chỗ ở
-- -----------------------------------------------------------------------------
CREATE TABLE listing_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 1,
    is_cover BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. LISTING AMENITIES (Many-to-Many)
-- Bảng trung gian liên kết Listing với các Tiện nghi
-- -----------------------------------------------------------------------------
CREATE TABLE listing_amenities (
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (listing_id, amenity_id)
);

-- -----------------------------------------------------------------------------
-- 7. FAVORITES
-- Danh sách chỗ ở yêu thích (Wishlist) của người dùng
-- -----------------------------------------------------------------------------
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, listing_id)
);

-- -----------------------------------------------------------------------------
-- 8. REVIEWS
-- Bài đánh giá và điểm số sao của khách hàng
-- -----------------------------------------------------------------------------
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    cleanliness_rating INTEGER DEFAULT 5 CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    accuracy_rating INTEGER DEFAULT 5 CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    checkin_rating INTEGER DEFAULT 5 CHECK (checkin_rating >= 1 AND checkin_rating <= 5),
    communication_rating INTEGER DEFAULT 5 CHECK (communication_rating >= 1 AND communication_rating <= 5),
    location_rating INTEGER DEFAULT 5 CHECK (location_rating >= 1 AND location_rating <= 5),
    value_rating INTEGER DEFAULT 5 CHECK (value_rating >= 1 AND value_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. BOOKINGS
-- Đơn đặt phòng và khoảng ngày lưu trú
-- Công thức: total_price = (price_per_night * total_nights) + cleaning_fee + service_fee
-- -----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(100) UNIQUE NOT NULL,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_nights INTEGER NOT NULL CHECK (total_nights > 0),
    number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
    base_price_total NUMERIC(12, 2) NOT NULL,
    cleaning_fee NUMERIC(12, 2) DEFAULT 0.00,
    service_fee NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL,
    booking_status VARCHAR(50) DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_booking_dates CHECK (check_out_date > check_in_date)
);

-- -----------------------------------------------------------------------------
-- 10. PAYMENTS
-- Bản ghi thanh toán (Mock payment) tương ứng cho các đơn đặt phòng
-- -----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50) DEFAULT 'credit_card',
    payment_status VARCHAR(50) DEFAULT 'succeeded' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
    transaction_reference VARCHAR(100),
    mock_card_last4 VARCHAR(10) DEFAULT '4242',
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES TỐI ƯU HÓA TRUY VẤN
-- Giúp các câu lệnh SELECT, LỌC và JOIN chạy với tốc độ cao
-- -----------------------------------------------------------------------------
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_region ON listings(region);
CREATE INDEX idx_listings_price ON listings(price_per_night);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_bookings_listing_dates ON bookings(listing_id, check_in_date, check_out_date);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_photos_listing ON listing_photos(listing_id, is_cover);
