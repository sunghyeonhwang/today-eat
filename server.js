/**
 * 오늘 뭐먹지 (What-eat-today) - Server
 * Node.js + Express + Supabase PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
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
app.use(express.static(path.join(__dirname)));

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
// Visit History Endpoints
// ===================

// GET /api/visits - 방문 기록 조회
app.get('/api/visits', async (req, res) => {
  try {
    const { session_id, user_id, limit = 20 } = req.query;

    let query = supabase
      .from('visit_history')
      .select(`
        *,
        restaurant:restaurants(id, name, emoji, category)
      `)
      .order('visited_at', { ascending: false })
      .limit(limit);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (session_id) {
      query = query.eq('session_id', session_id);
    }

    const { data, error } = await query;

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
// Review Endpoints
// ===================

// GET /api/reviews - 리뷰 조회
app.get('/api/reviews', async (req, res) => {
  try {
    const { restaurant_id, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants(id, name, emoji, category)
      `)
      .eq('is_public', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (restaurant_id) {
      query = query.eq('restaurant_id', restaurant_id);
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

// GET /api/reviews/:id - 특정 리뷰 조회
app.get('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
app.get('*', (req, res) => {
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
  console.log('  GET  /api/health           - Health check');
  console.log('  GET  /api/restaurants      - List restaurants');
  console.log('  GET  /api/restaurants/random - Random restaurant (gacha)');
  console.log('  GET  /api/restaurants/:id  - Get restaurant');
  console.log('  POST /api/restaurants      - Add restaurant');
  console.log('  GET  /api/visits           - List visits');
  console.log('  POST /api/visits           - Add visit');
  console.log('  GET  /api/reviews          - List reviews');
  console.log('  POST /api/reviews          - Add review');
  console.log('  PATCH /api/reviews/:id     - Update review');
  console.log('  DELETE /api/reviews/:id    - Delete review');
  console.log('');
});

module.exports = app;
