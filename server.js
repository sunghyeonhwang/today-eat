/**
 * 오늘 뭐먹지 (What-eat-today) - Server
 * Node.js + Express + Supabase PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { searchNearbyRestaurants } = require('./services/naverSearch');
require('dotenv').config();

// ===================
// Environment Variables
// ===================
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_ANON_KEY');
  console.error('\nPlease create a .env file with these variables.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

// ===================
// Initialize Supabase Client
// ===================
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================
// Initialize Express App
// ===================
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from root and public directory
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// ===================
// Health Check
// ===================
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('count')
      .limit(1);

    if (error) throw error;

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===================
// Restaurant Endpoints
// ===================

// GET /api/restaurants - 모든 식당 조회
app.get('/api/restaurants', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/restaurants/stats - 식당 통계 조회
app.get('/api/restaurants/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_stats')
      .select('*');

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/restaurants/random - 랜덤 식당 조회 (가챠용)
app.get('/api/restaurants/random', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No restaurants found'
      });
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * data.length);
    const randomRestaurant = data[randomIndex];

    res.json({
      success: true,
      data: randomRestaurant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/restaurants/:id - 특정 식당 조회
app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/restaurants - 식당 추가
app.post('/api/restaurants', async (req, res) => {
  try {
    const {
      name,
      emoji = '🍽️',
      category,
      sub_category,
      description,
      address,
      phone,
      latitude,
      longitude,
      price_range,
      average_price,
      opening_hours,
      image_url
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name and category are required'
      });
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert([{
        name,
        emoji,
        category,
        sub_category,
        description,
        address,
        phone,
        latitude,
        longitude,
        price_range,
        average_price,
        opening_hours,
        image_url
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================
// Nearby Restaurant Search (Naver API)
// ===================

// GET /api/nearby-restaurants - 주변 음식점 검색 (네이버 지역검색 API)
app.get('/api/nearby-restaurants', async (req, res) => {
  try {
    const {
      location,
      latitude,
      longitude,
      category,
      count = 10
    } = req.query;

    // 위치 정보 확인 - location 또는 좌표 필요
    let searchLocation = location;

    // 좌표가 주어진 경우 역지오코딩으로 주소 획득 시도
    // (현재는 좌표를 직접 사용할 수 없으므로 location 파라미터 필수)
    if (!searchLocation) {
      if (latitude && longitude) {
        // TODO: 역지오코딩 API 연동 시 좌표로부터 주소 획득
        // 현재는 좌표만으로는 검색 불가
        return res.status(400).json({
          success: false,
          error: '위치 정보(location)가 필요합니다. 예: location=강남역',
          hint: '좌표 기반 검색은 향후 지원 예정입니다.'
        });
      }

      return res.status(400).json({
        success: false,
        error: '위치 정보(location)가 필요합니다.',
        example: '/api/nearby-restaurants?location=강남역&category=한식&count=10'
      });
    }

    // 검색 개수 제한 (1-10)
    const searchCount = Math.max(1, Math.min(parseInt(count, 10) || 10, 10));

    // 네이버 API 호출
    const result = await searchNearbyRestaurants({
      location: searchLocation,
      category: category || '',
      count: searchCount
    });

    res.json({
      success: true,
      data: result.restaurants,
      meta: {
        total: result.total,
        location: result.location,
        category: result.category,
        source: 'naver_local_search'
      }
    });
  } catch (error) {
    console.error('주변 음식점 검색 오류:', error.message);

    // 에러 유형에 따른 응답
    if (error.message.includes('네이버 API 인증')) {
      return res.status(503).json({
        success: false,
        error: '외부 검색 서비스를 사용할 수 없습니다.',
        code: 'NAVER_API_CONFIG_ERROR'
      });
    }

    if (error.message.includes('네이버 API 호출 실패')) {
      return res.status(502).json({
        success: false,
        error: '외부 검색 서비스 응답 오류',
        code: 'NAVER_API_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================
// Visit History Endpoints (이용 기록)
// ===================

// GET /api/visits - 방문 기록 조회 (enhanced with date filtering)
app.get('/api/visits', async (req, res) => {
  try {
    const {
      session_id,
      user_id,
      limit = 20,
      offset = 0,
      start_date,
      end_date,
      visit_type,
      is_favorite
    } = req.query;

    let query = supabase
      .from('visit_history')
      .select(`
        *,
        restaurant:restaurants(id, name, emoji, category, sub_category, address)
      `)
      .order('visited_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // User/Session filtering
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (session_id) {
      query = query.eq('session_id', session_id);
    }

    // Date range filtering
    if (start_date) {
      query = query.gte('visited_at', start_date);
    }
    if (end_date) {
      query = query.lte('visited_at', end_date);
    }

    // Visit type filtering
    if (visit_type) {
      query = query.eq('visit_type', visit_type);
    }

    // Favorite filtering
    if (is_favorite !== undefined) {
      query = query.eq('is_favorite', is_favorite === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/usage-stats - 이용 통계 조회
app.get('/api/usage-stats', async (req, res) => {
  try {
    const { session_id, user_id, period = 'all' } = req.query;

    // Calculate date range based on period
    let startDate = null;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = null;
    }

    // Build base query for visit history
    let visitQuery = supabase
      .from('visit_history')
      .select(`
        id,
        restaurant_id,
        visit_type,
        visited_at,
        is_favorite,
        restaurant:restaurants(id, name, category)
      `);

    // Apply user/session filter
    if (user_id) {
      visitQuery = visitQuery.eq('user_id', user_id);
    } else if (session_id) {
      visitQuery = visitQuery.eq('session_id', session_id);
    }

    // Apply date filter
    if (startDate) {
      visitQuery = visitQuery.gte('visited_at', startDate.toISOString());
    }

    const { data: visits, error: visitError } = await visitQuery;

    if (visitError) throw visitError;

    // Calculate statistics
    const totalVisits = visits.length;
    const favoriteCount = visits.filter(v => v.is_favorite).length;

    // Visit type breakdown
    const visitTypeStats = visits.reduce((acc, visit) => {
      acc[visit.visit_type] = (acc[visit.visit_type] || 0) + 1;
      return acc;
    }, {});

    // Category breakdown
    const categoryStats = visits.reduce((acc, visit) => {
      if (visit.restaurant) {
        const category = visit.restaurant.category;
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, {});

    // Most visited restaurants
    const restaurantVisits = visits.reduce((acc, visit) => {
      if (visit.restaurant) {
        const id = visit.restaurant.id;
        if (!acc[id]) {
          acc[id] = {
            id,
            name: visit.restaurant.name,
            category: visit.restaurant.category,
            count: 0
          };
        }
        acc[id].count++;
      }
      return acc;
    }, {});

    const topRestaurants = Object.values(restaurantVisits)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        period,
        totalVisits,
        favoriteCount,
        visitTypeStats,
        categoryStats,
        topRestaurants
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/visits - 방문 기록 추가
app.post('/api/visits', async (req, res) => {
  try {
    const {
      restaurant_id,
      user_id,
      session_id,
      visit_type = 'manual',
      memo
    } = req.body;

    if (!restaurant_id) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required'
      });
    }

    const { data, error } = await supabase
      .from('visit_history')
      .insert([{
        restaurant_id,
        user_id,
        session_id,
        visit_type,
        memo
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /api/visits/:id/favorite - 즐겨찾기 토글
app.patch('/api/visits/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_favorite } = req.body;

    const { data, error } = await supabase
      .from('visit_history')
      .update({ is_favorite })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================
// Review Endpoints (리뷰)
// ===================

// GET /api/reviews - 리뷰 조회 (세션 기반 접근 제한)
// 세션 ID가 제공된 경우: 해당 세션의 리뷰 + 공개 리뷰 표시
// 세션 ID가 없는 경우: 공개 리뷰만 표시
app.get('/api/reviews', async (req, res) => {
  try {
    const {
      restaurant_id,
      session_id,
      user_id,
      limit = 20,
      offset = 0,
      include_private = 'false'
    } = req.query;

    // 공개 리뷰 쿼리 (모든 사용자에게 표시)
    let query = supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants(id, name, emoji, category)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // 레스토랑 ID로 필터링
    if (restaurant_id) {
      query = query.eq('restaurant_id', restaurant_id);
    }

    // 세션/사용자 기반 접근 제한 로직
    // - include_private=true이고 session_id 또는 user_id가 제공된 경우: 자신의 비공개 리뷰도 포함
    // - 그 외의 경우: 공개 리뷰만 표시
    if (include_private === 'true' && (session_id || user_id)) {
      // 자신의 리뷰(공개+비공개) 또는 다른 사람의 공개 리뷰
      // Supabase에서는 OR 조건으로 복잡한 쿼리가 어려우므로 별도 처리
      const { data: allData, error } = await query;

      if (error) throw error;

      // 필터링: 공개 리뷰 또는 자신의 리뷰
      const filteredData = allData.filter(review => {
        if (review.is_public) return true;
        if (user_id && review.user_id === user_id) return true;
        if (session_id && review.session_id === session_id) return true;
        return false;
      });

      return res.json({
        success: true,
        data: filteredData,
        count: filteredData.length
      });
    } else {
      // 공개 리뷰만 표시
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reviews/my - 내 리뷰 조회 (세션/사용자 기반)
app.get('/api/reviews/my', async (req, res) => {
  try {
    const { session_id, user_id, limit = 20, offset = 0 } = req.query;

    if (!session_id && !user_id) {
      return res.status(400).json({
        success: false,
        error: 'session_id 또는 user_id가 필요합니다.'
      });
    }

    let query = supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants(id, name, emoji, category)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (session_id) {
      query = query.eq('session_id', session_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/restaurants/:id/reviews/summary - 식당 리뷰 요약 통계
app.get('/api/restaurants/:id/reviews/summary', async (req, res) => {
  try {
    const { id } = req.params;

    // 해당 식당의 공개 리뷰 조회
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating, tags, created_at')
      .eq('restaurant_id', id)
      .eq('is_public', true)
      .eq('is_deleted', false);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          restaurant_id: id,
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          topTags: [],
          recentReviewsCount: 0
        }
      });
    }

    // 평균 평점 계산
    const totalRating = reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    // 평점 분포 계산
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      const roundedRating = Math.round(parseFloat(r.rating));
      if (roundedRating >= 1 && roundedRating <= 5) {
        ratingDistribution[roundedRating]++;
      }
    });

    // 태그 집계
    const tagCounts = {};
    reviews.forEach(r => {
      if (r.tags && Array.isArray(r.tags)) {
        r.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // 최근 30일 리뷰 수
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviewsCount = reviews.filter(
      r => new Date(r.created_at) > thirtyDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        restaurant_id: id,
        totalReviews: reviews.length,
        averageRating,
        ratingDistribution,
        topTags,
        recentReviewsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reviews/:id - 특정 리뷰 조회 (세션 기반 접근 제한)
app.get('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { session_id, user_id } = req.query;

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants(id, name, emoji, category)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // 비공개 리뷰인 경우 소유자만 접근 가능
    if (!data.is_public) {
      const isOwner = (user_id && data.user_id === user_id) ||
                      (session_id && data.session_id === session_id);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: '비공개 리뷰는 작성자만 볼 수 있습니다.'
        });
      }
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/reviews - 리뷰 작성
app.post('/api/reviews', async (req, res) => {
  try {
    const {
      restaurant_id,
      visit_id,
      user_id,
      session_id,
      rating,
      title,
      content,
      tags = [],
      image_urls = [],
      is_public = true
    } = req.body;

    // Validation
    if (!restaurant_id || !rating || !content) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID, rating, and content are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        restaurant_id,
        visit_id,
        user_id,
        session_id,
        rating,
        title,
        content,
        tags,
        image_urls,
        is_public
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /api/reviews/:id - 리뷰 수정
app.patch('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rating,
      title,
      content,
      tags,
      image_urls,
      is_public
    } = req.body;

    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (image_urls !== undefined) updateData.image_urls = image_urls;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/reviews/:id - 리뷰 삭제 (소프트 삭제)
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reviews')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================
// Static File Serving
// ===================
// Catch-all route for SPA (Single Page Application)
// Only serve index.html for non-file requests (no extension)
app.get('*', (req, res) => {
  // If request is for a file with extension (e.g., .js, .css), let static middleware handle it
  if (req.path.includes('.')) {
    // If static middleware didn't find it, return 404
    return res.status(404).send('File not found');
  }
  // For routes without extension (SPA routes), serve index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===================
// Start Server
// ===================
app.listen(PORT, () => {
  console.log('');
  console.log('🍽️  오늘 뭐먹지 (What-eat-today) Server');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 API Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log('');
  console.log('Available endpoints:');
  console.log('');
  console.log('  [Health & Status]');
  console.log('  GET  /api/health                          - Health check');
  console.log('');
  console.log('  [Restaurants]');
  console.log('  GET  /api/restaurants                     - List restaurants');
  console.log('  GET  /api/restaurants/stats               - Restaurant stats');
  console.log('  GET  /api/restaurants/random              - Random restaurant (gacha)');
  console.log('  GET  /api/restaurants/:id                 - Get restaurant');
  console.log('  GET  /api/restaurants/:id/reviews/summary - Review summary');
  console.log('  POST /api/restaurants                     - Add restaurant');
  console.log('');
  console.log('  [External Search]');
  console.log('  GET  /api/nearby-restaurants              - Search nearby (Naver API)');
  console.log('');
  console.log('  [Usage Records / Visits]');
  console.log('  GET  /api/visits                          - List visits (with filters)');
  console.log('  GET  /api/usage-stats                     - Usage statistics');
  console.log('  POST /api/visits                          - Add visit');
  console.log('  PATCH /api/visits/:id/favorite            - Toggle favorite');
  console.log('');
  console.log('  [Reviews]');
  console.log('  GET  /api/reviews                         - List reviews (session-based)');
  console.log('  GET  /api/reviews/my                      - My reviews only');
  console.log('  GET  /api/reviews/:id                     - Get review');
  console.log('  POST /api/reviews                         - Add review');
  console.log('  PATCH /api/reviews/:id                    - Update review');
  console.log('  DELETE /api/reviews/:id                   - Delete review (soft)');
  console.log('');
});

module.exports = app;
