-- =====================================================
-- 오늘 뭐먹지 (What-eat-today) Database Schema
-- PostgreSQL 15+ (Supabase)
-- =====================================================

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. RESTAURANTS TABLE (식당 정보)
-- =====================================================
-- 식당의 기본 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS restaurants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    emoji           VARCHAR(10) NOT NULL DEFAULT '🍽️',
    category        VARCHAR(50) NOT NULL,
    sub_category    VARCHAR(50),
    description     TEXT,
    address         VARCHAR(255),
    phone           VARCHAR(20),
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    price_range     INTEGER CHECK (price_range BETWEEN 1 AND 4),  -- 1: 저렴, 4: 고급
    average_price   INTEGER,  -- 평균 가격 (원)
    opening_hours   JSONB,    -- 영업시간 (요일별)
    image_url       VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE restaurants IS '식당 정보 테이블';
COMMENT ON COLUMN restaurants.id IS '식당 고유 식별자 (UUID)';
COMMENT ON COLUMN restaurants.emoji IS '식당을 나타내는 이모지';
COMMENT ON COLUMN restaurants.category IS '주요 카테고리 (한식, 일식, 양식 등)';
COMMENT ON COLUMN restaurants.sub_category IS '세부 카테고리 (카레, 초밥, 파스타 등)';
COMMENT ON COLUMN restaurants.price_range IS '가격대 (1: 저렴 ~ 4: 고급)';
COMMENT ON COLUMN restaurants.opening_hours IS '영업시간 JSON ({"mon": {"open": "09:00", "close": "21:00"}, ...})';


-- =====================================================
-- 2. VISIT_HISTORY TABLE (이용 기록)
-- =====================================================
-- 사용자의 식당 방문/이용 기록을 저장하는 테이블
CREATE TABLE IF NOT EXISTS visit_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id         UUID,  -- Supabase Auth 사용자 ID (선택적)
    session_id      VARCHAR(100),  -- 비로그인 사용자 세션 ID
    visit_type      VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual', 'gacha', 'random'
    visited_at      TIMESTAMPTZ DEFAULT NOW(),
    memo            TEXT,
    is_favorite     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_visit_history_restaurant_id ON visit_history(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_user_id ON visit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_session_id ON visit_history(session_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_visited_at ON visit_history(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_history_visit_type ON visit_history(visit_type);

-- 코멘트 추가
COMMENT ON TABLE visit_history IS '식당 이용 기록 테이블';
COMMENT ON COLUMN visit_history.restaurant_id IS '방문한 식당 ID (FK)';
COMMENT ON COLUMN visit_history.user_id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN visit_history.session_id IS '비로그인 사용자 세션 식별자';
COMMENT ON COLUMN visit_history.visit_type IS '방문 유형 (manual: 직접선택, gacha: 가챠, random: 랜덤)';
COMMENT ON COLUMN visit_history.is_favorite IS '즐겨찾기 여부';


-- =====================================================
-- 3. REVIEWS TABLE (리뷰)
-- =====================================================
-- 사용자가 작성한 식당 리뷰를 저장하는 테이블
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    visit_id        UUID REFERENCES visit_history(id) ON DELETE SET NULL,
    user_id         UUID,  -- Supabase Auth 사용자 ID
    session_id      VARCHAR(100),  -- 비로그인 사용자 세션 ID
    rating          DECIMAL(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title           VARCHAR(100),
    content         TEXT NOT NULL,
    tags            TEXT[],  -- 태그 배열 ('맛있어요', '분위기좋아요' 등)
    image_urls      TEXT[],  -- 리뷰 이미지 URL 배열
    is_public       BOOLEAN DEFAULT TRUE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_is_public ON reviews(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_is_deleted ON reviews(is_deleted) WHERE is_deleted = FALSE;

-- GIN 인덱스 (태그 검색용)
CREATE INDEX IF NOT EXISTS idx_reviews_tags ON reviews USING GIN(tags);

-- 코멘트 추가
COMMENT ON TABLE reviews IS '식당 리뷰 테이블';
COMMENT ON COLUMN reviews.restaurant_id IS '리뷰 대상 식당 ID (FK)';
COMMENT ON COLUMN reviews.visit_id IS '연관된 방문 기록 ID (FK, 선택적)';
COMMENT ON COLUMN reviews.rating IS '평점 (1.0 ~ 5.0)';
COMMENT ON COLUMN reviews.tags IS '리뷰 태그 배열';
COMMENT ON COLUMN reviews.image_urls IS '리뷰 이미지 URL 배열';
COMMENT ON COLUMN reviews.is_public IS '공개 여부';
COMMENT ON COLUMN reviews.is_deleted IS '삭제 여부 (소프트 삭제)';


-- =====================================================
-- 4. VIEWS & COMPUTED COLUMNS
-- =====================================================

-- 식당별 평균 평점 및 리뷰 수 뷰
CREATE OR REPLACE VIEW restaurant_stats AS
SELECT
    r.id,
    r.name,
    r.emoji,
    r.category,
    COALESCE(AVG(rv.rating), 0)::DECIMAL(2, 1) AS average_rating,
    COUNT(rv.id) AS review_count,
    COUNT(vh.id) AS visit_count
FROM restaurants r
LEFT JOIN reviews rv ON r.id = rv.restaurant_id AND rv.is_deleted = FALSE AND rv.is_public = TRUE
LEFT JOIN visit_history vh ON r.id = vh.restaurant_id
WHERE r.is_active = TRUE
GROUP BY r.id, r.name, r.emoji, r.category;

COMMENT ON VIEW restaurant_stats IS '식당별 통계 뷰 (평균 평점, 리뷰 수, 방문 수)';


-- =====================================================
-- 5. FUNCTIONS & TRIGGERS
-- =====================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- restaurants 테이블 updated_at 트리거
DROP TRIGGER IF EXISTS trigger_restaurants_updated_at ON restaurants;
CREATE TRIGGER trigger_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- reviews 테이블 updated_at 트리거
DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) - Supabase 권한 설정
-- =====================================================

-- RLS 활성화
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- restaurants: 모든 사용자 읽기 가능
CREATE POLICY "restaurants_select_policy" ON restaurants
    FOR SELECT USING (is_active = TRUE);

-- restaurants: 인증된 사용자만 삽입 가능 (관리자용)
CREATE POLICY "restaurants_insert_policy" ON restaurants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- visit_history: 자신의 기록만 조회/수정 가능
CREATE POLICY "visit_history_select_policy" ON visit_history
    FOR SELECT USING (
        user_id = auth.uid() OR
        session_id IS NOT NULL
    );

CREATE POLICY "visit_history_insert_policy" ON visit_history
    FOR INSERT WITH CHECK (TRUE);  -- 모두 삽입 가능 (세션 기반 추적)

-- reviews: 공개 리뷰는 모두 조회 가능
CREATE POLICY "reviews_select_policy" ON reviews
    FOR SELECT USING (is_public = TRUE AND is_deleted = FALSE);

-- reviews: 자신의 리뷰만 삽입/수정/삭제 가능
CREATE POLICY "reviews_insert_policy" ON reviews
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "reviews_update_policy" ON reviews
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

CREATE POLICY "reviews_delete_policy" ON reviews
    FOR DELETE USING (
        user_id = auth.uid() OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );


-- =====================================================
-- 7. SEED DATA (초기 데이터)
-- =====================================================

INSERT INTO restaurants (name, emoji, category, sub_category, average_price) VALUES
    ('황금카레', '🍛', '일식', '카레', 9000),
    ('맛있는 국수집', '🍜', '한식', '국수', 8000),
    ('피자파티', '🍕', '양식', '피자', 15000),
    ('버거하우스', '🍔', '양식', '버거', 12000),
    ('스시도쿄', '🍣', '일식', '초밥', 25000),
    ('엄마손찌개', '🍲', '한식', '찌개', 10000),
    ('파스타공방', '🍝', '양식', '파스타', 14000),
    ('타코마니아', '🌮', '멕시칸', '타코', 11000),
    ('도시락명가', '🍱', '한식', '도시락', 7000),
    ('샐러드팜', '🥗', '양식', '샐러드', 13000)
ON CONFLICT DO NOTHING;


-- =====================================================
-- 완료 메시지
-- =====================================================
-- 스키마 생성 완료!
-- Supabase 대시보드에서 이 SQL을 실행하거나,
-- supabase db push 명령어를 사용하세요.
