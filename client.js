/**
 * 오늘 뭐먹지 - Client Side JavaScript
 * Material Design 3 Expressive Motion Implementation
 */

// ===================
// Restaurant Data (Fallback for gacha)
// ===================
const defaultRestaurants = [
  { id: 1, emoji: '🍛', name: '황금카레', category: '일식 · 카레', rating: 4.7, distance: '120m', price: '9,000원', address: '서울시 강남구 역삼동 123-45', telephone: '02-1234-5678' },
  { id: 2, emoji: '🍜', name: '맛있는 국수집', category: '한식 · 국수', rating: 4.5, distance: '350m', price: '8,000원', address: '서울시 강남구 역삼동 234-56', telephone: '02-2345-6789' },
  { id: 3, emoji: '🍕', name: '피자파티', category: '양식 · 피자', rating: 4.8, distance: '500m', price: '15,000원', address: '서울시 강남구 역삼동 345-67', telephone: '02-3456-7890' },
  { id: 4, emoji: '🍔', name: '버거하우스', category: '양식 · 버거', rating: 4.3, distance: '650m', price: '12,000원', address: '서울시 강남구 역삼동 456-78', telephone: '02-4567-8901' },
  { id: 5, emoji: '🍣', name: '스시도쿄', category: '일식 · 초밥', rating: 4.9, distance: '800m', price: '25,000원', address: '서울시 강남구 역삼동 567-89', telephone: '02-5678-9012' },
  { id: 6, emoji: '🍲', name: '엄마손찌개', category: '한식 · 찌개', rating: 4.6, distance: '200m', price: '10,000원', address: '서울시 강남구 역삼동 678-90', telephone: '02-6789-0123' },
  { id: 7, emoji: '🍝', name: '파스타공방', category: '양식 · 파스타', rating: 4.4, distance: '450m', price: '14,000원', address: '서울시 강남구 역삼동 789-01', telephone: '02-7890-1234' },
  { id: 8, emoji: '🌮', name: '타코마니아', category: '멕시칸 · 타코', rating: 4.2, distance: '700m', price: '11,000원', address: '서울시 강남구 역삼동 890-12', telephone: '02-8901-2345' },
  { id: 9, emoji: '🍱', name: '도시락명가', category: '한식 · 도시락', rating: 4.5, distance: '300m', price: '7,000원', address: '서울시 강남구 역삼동 901-23', telephone: '02-9012-3456' },
  { id: 10, emoji: '🥗', name: '샐러드팜', category: '양식 · 샐러드', rating: 4.7, distance: '550m', price: '13,000원', address: '서울시 강남구 역삼동 012-34', telephone: '02-0123-4567' }
];

// 가챠에 사용할 식당 목록 (API에서 가져온 데이터 또는 기본값)
let gachaRestaurants = [...defaultRestaurants];

// ===================
// Location & Nearby Restaurants Manager
// ===================
class LocationManager {
  constructor() {
    this.currentPosition = null;
    this.isLoading = false;
    this.nearbyRestaurants = [];
  }

  /**
   * 브라우저 Geolocation API로 현재 위치 가져오기
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5분 캐시
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          resolve(this.currentPosition);
        },
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 가져올 수 없습니다.';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 요청 시간이 초과되었습니다.';
              break;
            default:
              errorMessage = '알 수 없는 오류가 발생했습니다.';
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * 주변 음식점 검색 API 호출
   * @param {string} location - 검색 위치 (예: 강남역)
   * @param {string} category - 음식 카테고리 (선택)
   * @param {number} count - 검색 개수 (기본 10)
   * @returns {Promise<Array>}
   */
  async fetchNearbyRestaurants(location, category = '', count = 10) {
    this.isLoading = true;

    try {
      const params = new URLSearchParams({
        location,
        count: count.toString()
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/nearby-restaurants?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '음식점 검색에 실패했습니다.');
      }

      this.nearbyRestaurants = result.data;
      return {
        restaurants: result.data,
        meta: result.meta
      };
    } catch (error) {
      console.error('주변 음식점 검색 오류:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 좌표를 주소로 변환 (역지오코딩) - 향후 구현 예정
   * 현재는 기본 위치 이름 반환
   */
  async getLocationName(latitude, longitude) {
    // TODO: 역지오코딩 API 연동
    // 현재는 좌표 기반 위치명 반환
    return '현재 위치';
  }
}

// ===================
// Nearby Restaurants UI Manager
// ===================
class NearbyRestaurantsUI {
  constructor(locationManager) {
    this.locationManager = locationManager;
    this.container = null;
    this.currentLocation = '';
    this.currentCategory = '';
  }

  /**
   * 식당 목록 컨테이너 초기화
   */
  init() {
    this.container = document.getElementById('restaurant-list-container');
    this.setupLocationInput();
  }

  /**
   * 위치 입력 UI 설정
   */
  setupLocationInput() {
    const restaurantsScreen = document.getElementById('screen-restaurants');
    if (!restaurantsScreen) return;

    // 헤더 아래에 위치 입력 영역 추가
    const header = restaurantsScreen.querySelector('.flex.items-center.gap-4.p-4.bg-white');
    if (header && !document.getElementById('location-input-section')) {
      const locationSection = document.createElement('div');
      locationSection.id = 'location-input-section';
      locationSection.className = 'px-4 pb-4 bg-white border-b border-gray-200 -mx-4';
      locationSection.innerHTML = `
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <input
              type="text"
              id="location-input"
              placeholder="위치를 입력하세요 (예: 강남역, 홍대입구)"
              class="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              id="btn-use-current-location"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
              title="현재 위치 사용"
            >
              📍
            </button>
          </div>
          <button
            type="button"
            id="btn-search-restaurants"
            class="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          >
            검색
          </button>
        </div>
        <div id="location-status" class="mt-2 text-sm text-gray-500 hidden"></div>
      `;

      header.insertAdjacentElement('afterend', locationSection);

      // 이벤트 리스너 설정
      this.setupEventListeners();
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    const locationInput = document.getElementById('location-input');
    const searchBtn = document.getElementById('btn-search-restaurants');
    const currentLocationBtn = document.getElementById('btn-use-current-location');

    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleSearch());
    }

    if (locationInput) {
      locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch();
        }
      });
    }

    if (currentLocationBtn) {
      currentLocationBtn.addEventListener('click', () => this.handleUseCurrentLocation());
    }
  }

  /**
   * 검색 핸들러
   */
  async handleSearch() {
    const locationInput = document.getElementById('location-input');
    const location = locationInput?.value.trim();

    if (!location) {
      this.showStatus('위치를 입력해 주세요.', 'error');
      return;
    }

    await this.searchNearbyRestaurants(location);
  }

  /**
   * 현재 위치 사용 핸들러
   */
  async handleUseCurrentLocation() {
    const locationInput = document.getElementById('location-input');

    this.showStatus('현재 위치를 확인 중...', 'info');

    try {
      const position = await this.locationManager.getCurrentPosition();
      // 위치를 가져왔지만 아직 역지오코딩이 안되므로 안내 메시지 표시
      this.showStatus(
        `위치 확인됨 (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}). 현재 좌표 기반 검색은 준비 중입니다. 주소를 직접 입력해 주세요.`,
        'warning'
      );
    } catch (error) {
      this.showStatus(error.message, 'error');
    }
  }

  /**
   * 주변 음식점 검색 및 표시
   */
  async searchNearbyRestaurants(location, category = '') {
    this.currentLocation = location;
    this.currentCategory = category;

    this.showLoadingState();

    try {
      const result = await this.locationManager.fetchNearbyRestaurants(location, category, 10);
      this.renderRestaurantList(result.restaurants, result.meta);
      this.showStatus(`'${result.meta.location}' 주변 음식점 ${result.restaurants.length}개를 찾았습니다.`, 'success');
    } catch (error) {
      this.showErrorState(error.message);
    }
  }

  /**
   * 로딩 상태 표시
   */
  showLoadingState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-500">주변 음식점을 검색 중입니다...</p>
      </div>
    `;
  }

  /**
   * 에러 상태 표시
   */
  showErrorState(message) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <span class="text-6xl mb-4 opacity-50" aria-hidden="true">😢</span>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">검색 실패</h3>
        <p class="text-sm text-gray-500 mb-6">${message}</p>
        <button
          type="button"
          class="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          onclick="nearbyRestaurantsUI.handleSearch()"
        >
          다시 시도
        </button>
      </div>
    `;

    this.showStatus(message, 'error');
  }

  /**
   * 빈 상태 표시
   */
  showEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <span class="text-6xl mb-4 opacity-50" aria-hidden="true">🔍</span>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">검색 결과가 없습니다</h3>
        <p class="text-sm text-gray-500">다른 위치나 카테고리로 검색해 보세요.</p>
      </div>
    `;
  }

  /**
   * 식당 목록 렌더링
   */
  renderRestaurantList(restaurants, meta) {
    if (!this.container) return;

    if (!restaurants || restaurants.length === 0) {
      this.showEmptyState();
      return;
    }

    const html = restaurants.map((restaurant, index) => this.createRestaurantCard(restaurant, index)).join('');
    this.container.innerHTML = html;

    // 애니메이션 효과 (staggered)
    const cards = this.container.querySelectorAll('article');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  /**
   * 식당 카드 HTML 생성
   */
  createRestaurantCard(restaurant, index) {
    const emoji = this.getCategoryEmoji(restaurant.category);
    const address = restaurant.address || '';
    const shortAddress = address.length > 30 ? address.substring(0, 30) + '...' : address;

    return `
      <article class="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" data-restaurant-id="${index}">
        <div class="w-20 h-20 bg-bg-secondary rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          <span aria-hidden="true">${emoji}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between mb-1">
            <h3 class="text-base font-semibold text-gray-900 truncate">${restaurant.title}</h3>
          </div>
          <p class="text-sm text-gray-500 mb-2">${restaurant.category}</p>
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span class="flex items-center gap-1 truncate" title="${address}">
              <span aria-hidden="true">📍</span>
              <span>${shortAddress}</span>
            </span>
          </div>
          ${restaurant.telephone ? `
            <div class="mt-1 text-xs text-gray-400">
              <span aria-hidden="true">📞</span>
              <a href="tel:${restaurant.telephone}" class="text-primary hover:underline">${restaurant.telephone}</a>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }

  /**
   * 카테고리에 맞는 이모지 반환
   */
  getCategoryEmoji(category) {
    if (!category) return '🍽️';

    const categoryLower = category.toLowerCase();
    const emojiMap = {
      '한식': '🍲',
      '일식': '🍣',
      '중식': '🥟',
      '양식': '🍝',
      '분식': '🍜',
      '치킨': '🍗',
      '피자': '🍕',
      '버거': '🍔',
      '카페': '☕',
      '베이커리': '🥐',
      '디저트': '🍰',
      '술집': '🍺',
      '고기': '🥩',
      '해산물': '🦐',
      '샐러드': '🥗',
      '멕시칸': '🌮',
      '태국': '🍛',
      '베트남': '🍜',
      '인도': '🍛'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (categoryLower.includes(key)) {
        return emoji;
      }
    }

    return '🍽️';
  }

  /**
   * 상태 메시지 표시
   */
  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('location-status');
    if (!statusEl) return;

    statusEl.classList.remove('hidden', 'text-gray-500', 'text-green-600', 'text-red-600', 'text-amber-600');

    switch (type) {
      case 'success':
        statusEl.classList.add('text-green-600');
        break;
      case 'error':
        statusEl.classList.add('text-red-600');
        break;
      case 'warning':
        statusEl.classList.add('text-amber-600');
        break;
      default:
        statusEl.classList.add('text-gray-500');
    }

    statusEl.textContent = message;
  }
}

// Global instances
const locationManager = new LocationManager();
let nearbyRestaurantsUI = null;

// ===================
// Gacha Data Manager
// ===================
class GachaDataManager {
  constructor(locationManager) {
    this.locationManager = locationManager;
    this.restaurants = [...defaultRestaurants];
    this.lastSearchLocation = null;
    this.isLoading = false;
  }

  /**
   * 카테고리에 맞는 이모지 반환
   */
  getCategoryEmoji(category) {
    if (!category) return '🍽️';

    const categoryLower = category.toLowerCase();
    const emojiMap = {
      '한식': '🍲',
      '일식': '🍣',
      '중식': '🥟',
      '양식': '🍝',
      '분식': '🍜',
      '치킨': '🍗',
      '피자': '🍕',
      '버거': '🍔',
      '카페': '☕',
      '베이커리': '🥐',
      '디저트': '🍰',
      '술집': '🍺',
      '고기': '🥩',
      '해산물': '🦐',
      '샐러드': '🥗',
      '멕시칸': '🌮',
      '태국': '🍛',
      '베트남': '🍜',
      '인도': '🍛',
      '국수': '🍜',
      '카레': '🍛',
      '초밥': '🍣',
      '라멘': '🍜',
      '찌개': '🍲',
      '비빔밥': '🍚',
      '불고기': '🥩',
      '삼겹살': '🥓',
      '파스타': '🍝',
      '스테이크': '🥩',
      '도시락': '🍱'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (categoryLower.includes(key)) {
        return emoji;
      }
    }

    return '🍽️';
  }

  /**
   * API 데이터를 가챠용 형식으로 변환
   */
  formatRestaurantForGacha(restaurant, index) {
    return {
      id: index + 1,
      emoji: this.getCategoryEmoji(restaurant.category),
      name: restaurant.title,
      category: restaurant.category || '음식점',
      rating: (Math.random() * 1 + 4).toFixed(1), // API에서 제공하지 않으면 임의 생성 (4.0~5.0)
      distance: restaurant.distance || '-',
      price: restaurant.price || '-',
      address: restaurant.address || '',
      telephone: restaurant.telephone || '',
      link: restaurant.link || '',
      mapx: restaurant.mapx,
      mapy: restaurant.mapy
    };
  }

  /**
   * 주변 식당 데이터를 가챠용으로 로드
   */
  async loadRestaurantsForGacha(location) {
    if (this.isLoading) return this.restaurants;

    this.isLoading = true;

    try {
      const result = await this.locationManager.fetchNearbyRestaurants(location, '', 10);

      if (result.restaurants && result.restaurants.length > 0) {
        this.restaurants = result.restaurants.map((r, i) => this.formatRestaurantForGacha(r, i));
        this.lastSearchLocation = location;
        gachaRestaurants = this.restaurants;
        return this.restaurants;
      }
    } catch (error) {
      console.error('가챠용 식당 데이터 로드 실패:', error);
    } finally {
      this.isLoading = false;
    }

    // 실패 시 기본 데이터 반환
    return this.restaurants;
  }

  /**
   * 현재 가챠용 식당 목록 반환
   */
  getRestaurants() {
    return this.restaurants;
  }

  /**
   * 랜덤 식당 선택
   */
  getRandomRestaurant() {
    const restaurants = this.getRestaurants();
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    return restaurants[randomIndex];
  }

  /**
   * 데이터 초기화 (기본값으로)
   */
  reset() {
    this.restaurants = [...defaultRestaurants];
    gachaRestaurants = this.restaurants;
    this.lastSearchLocation = null;
  }
}

// Global gacha data manager instance
let gachaDataManager = null;

// ===================
// DOM Elements
// ===================
const screens = {
  home: document.getElementById('screen-home'),
  restaurants: document.getElementById('screen-restaurants'),
  gacha: document.getElementById('screen-gacha'),
  gachaResult: document.getElementById('screen-gacha-result'),
  reviewWrite: document.getElementById('screen-review-write'),
  reviews: document.getElementById('screen-reviews')
};

// ===================
// State Management
// ===================
let currentScreen = 'home';
let isSpinning = false;
let selectedRestaurant = null;

// ===================
// Screen Navigation
// ===================
function showScreen(screenName) {
  // Hide all screens with exit animation
  Object.entries(screens).forEach(([name, screen]) => {
    if (screen && name !== screenName) {
      screen.classList.add('hidden');
      screen.classList.remove('screen-transition-enter-active');
    }
  });

  // Show target screen with enter animation
  const targetScreen = screens[screenName];
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('screen-transition-enter');

    // Trigger reflow
    void targetScreen.offsetWidth;

    targetScreen.classList.remove('screen-transition-enter');
    targetScreen.classList.add('screen-transition-enter-active');

    currentScreen = screenName;
    updateNavigation(screenName);
  }
}

function updateNavigation(screenName) {
  const navItems = document.querySelectorAll('[data-nav]');
  navItems.forEach(item => {
    const navTarget = item.getAttribute('data-nav');
    if (navTarget === screenName) {
      item.classList.add('text-primary');
      item.classList.remove('text-gray-500');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('text-primary');
      item.classList.add('text-gray-500');
      item.removeAttribute('aria-current');
    }
  });
}

// ===================
// Gacha Animation System
// ===================
class GachaAnimator {
  constructor() {
    this.slotWindow = null;
    this.reelContainer = null;
    this.emojis = gachaRestaurants.map(r => r.emoji);
    this.spinDuration = 2500; // Total spin time in ms (slightly longer for more excitement)
    this.isAnimating = false;
    this.anticipationDuration = 500; // Pre-spin anticipation
  }

  /**
   * 이모지 목록 업데이트
   */
  refreshEmojis() {
    this.emojis = gachaRestaurants.map(r => r.emoji);
  }

  init() {
    this.createSlotMachine();
  }

  createSlotMachine() {
    const gachaSection = document.getElementById('screen-gacha');
    if (!gachaSection) return;

    const slotContainer = gachaSection.querySelector('.w-48.h-48');
    if (!slotContainer) return;

    // Add machine class
    slotContainer.classList.add('gacha-machine');
    this.slotWindow = slotContainer;

    // Create reel container
    this.reelContainer = document.createElement('div');
    this.reelContainer.className = 'gacha-reel-container';

    // Create reel with emoji items
    this.reel = document.createElement('div');
    this.reel.className = 'gacha-reel';
    this.updateReelItems();

    this.reelContainer.appendChild(this.reel);

    // Find and replace the static emoji
    const staticEmoji = slotContainer.querySelector('.text-7xl');
    if (staticEmoji) {
      staticEmoji.style.display = 'none';
    }

    slotContainer.appendChild(this.reelContainer);
  }

  updateReelItems(selectedEmoji = '🎲') {
    // Shuffle emojis for variety
    const shuffled = [...this.emojis].sort(() => Math.random() - 0.5);

    // Create multiple copies for seamless spinning
    const items = [];
    for (let i = 0; i < 4; i++) {
      shuffled.forEach(emoji => {
        items.push(emoji);
      });
    }

    // Ensure selected emoji is at a visible position
    if (selectedEmoji !== '🎲') {
      items[20] = selectedEmoji; // Position to land on
    }

    this.reel.innerHTML = items.map(emoji =>
      `<div class="gacha-reel-item emoji-slot-item">${emoji}</div>`
    ).join('');
  }

  async spin() {
    if (this.isAnimating) return null;
    this.isAnimating = true;

    // 이모지 목록 새로고침
    this.refreshEmojis();

    // Select random restaurant from current gacha data
    const randomIndex = Math.floor(Math.random() * gachaRestaurants.length);
    const selected = gachaRestaurants[randomIndex];

    // Update reel with selected item
    this.updateReelItems(selected.emoji);

    // Phase 0: Anticipation (slight pull-back effect)
    this.slotWindow.classList.add('gacha-machine--anticipation');
    await this.delay(this.anticipationDuration);
    this.slotWindow.classList.remove('gacha-machine--anticipation');

    // Phase 1: Start spinning
    this.slotWindow.classList.add('gacha-machine--spinning');
    this.slotWindow.classList.remove('gacha-machine--stopping', 'gacha-machine--revealed');

    // Add haptic ripple effect
    this.triggerHapticVisual();

    // Add drum roll sound effect visual
    this.addDrumRollEffect();

    // Wait for spin duration
    await this.delay(this.spinDuration);

    // Phase 2: Decelerate and stop
    this.slotWindow.classList.remove('gacha-machine--spinning');
    this.slotWindow.classList.add('gacha-machine--stopping');

    // Remove drum roll effect
    this.removeDrumRollEffect();

    // Calculate final position to show selected emoji
    const itemHeight = 120;
    const targetPosition = -20 * itemHeight; // Position of selected item
    this.reel.style.transition = 'transform 1s cubic-bezier(0.05, 0.7, 0.1, 1)';
    this.reel.style.transform = `translateY(${targetPosition}px)`;

    await this.delay(1000);

    // Phase 3: Reveal with dramatic pause
    this.slotWindow.classList.remove('gacha-machine--stopping');
    this.slotWindow.classList.add('gacha-machine--revealed');

    // Trigger particle burst
    this.triggerParticleBurst();

    // Add glow effect on result
    this.addGlowEffect();

    this.isAnimating = false;
    return selected;
  }

  /**
   * 드럼롤 효과 추가
   */
  addDrumRollEffect() {
    const drumRoll = document.createElement('div');
    drumRoll.className = 'gacha-drum-roll';
    drumRoll.id = 'gacha-drum-roll';
    this.slotWindow.appendChild(drumRoll);
  }

  /**
   * 드럼롤 효과 제거
   */
  removeDrumRollEffect() {
    const drumRoll = document.getElementById('gacha-drum-roll');
    if (drumRoll) {
      drumRoll.remove();
    }
  }

  /**
   * 결과 발광 효과 추가
   */
  addGlowEffect() {
    const glow = document.createElement('div');
    glow.className = 'gacha-result-glow';
    this.slotWindow.appendChild(glow);
    setTimeout(() => glow.remove(), 2000);
  }

  triggerHapticVisual() {
    const ripple = document.createElement('div');
    ripple.className = 'haptic-ripple haptic-ripple--active';
    this.slotWindow.appendChild(ripple);

    setTimeout(() => ripple.remove(), 400);
  }

  triggerParticleBurst() {
    const burst = document.createElement('div');
    burst.className = 'particle-burst particle-burst--active';

    const colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#FF8C5A', '#7EDDD6'];

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const angle = (i / 12) * 360;
      const distance = 80 + Math.random() * 40;
      const tx = Math.cos(angle * Math.PI / 180) * distance;
      const ty = Math.sin(angle * Math.PI / 180) * distance;
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.backgroundColor = colors[i % colors.length];
      burst.appendChild(particle);
    }

    this.slotWindow.appendChild(burst);
    setTimeout(() => burst.remove(), 800);
  }

  reset() {
    if (this.reel) {
      this.reel.style.transition = 'none';
      this.reel.style.transform = 'translateY(0)';
    }
    if (this.slotWindow) {
      this.slotWindow.classList.remove(
        'gacha-machine--spinning',
        'gacha-machine--stopping',
        'gacha-machine--revealed'
      );
    }
    this.updateReelItems();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===================
// Confetti System
// ===================
class ConfettiSystem {
  constructor() {
    this.container = null;
    this.colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#FF8C5A', '#7EDDD6', '#E55A2B'];
    this.shapes = ['circle', 'square', 'triangle'];
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'confetti-container';
    document.body.appendChild(this.container);
  }

  burst(count = 50) {
    if (!this.container) this.init();

    for (let i = 0; i < count; i++) {
      setTimeout(() => this.createConfetti(), i * 30);
    }
  }

  createConfetti() {
    const confetti = document.createElement('div');
    const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];

    confetti.className = `confetti confetti--${shape}`;
    confetti.style.backgroundColor = shape !== 'triangle' ? color : 'transparent';
    confetti.style.borderBottomColor = color;
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.animation = 'confettiFall 3s ease-out forwards';

    this.container.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// ===================
// Result Display
// ===================
function displayGachaResult(restaurant) {
  const resultScreen = document.getElementById('screen-gacha-result');
  if (!resultScreen) return;

  // Update result content
  const imageContainer = resultScreen.querySelector('.w-40.h-40');
  const name = resultScreen.querySelector('#result-title');
  const category = resultScreen.querySelector('#result-title + p');
  const infoContainer = resultScreen.querySelector('#gacha-result-info');
  const addressContainer = resultScreen.querySelector('#gacha-result-address');
  const reviewContainer = resultScreen.querySelector('#gacha-result-review');

  // 이모지와 이미지 컨테이너 업데이트
  if (imageContainer) {
    imageContainer.innerHTML = `<span class="text-6xl gacha-result-image" aria-hidden="true">${restaurant.emoji}</span>`;
  }

  // 이름 업데이트
  if (name) {
    name.textContent = restaurant.name;
    name.classList.add('gacha-result-name');
  }

  // 카테고리 업데이트
  if (category) {
    category.textContent = restaurant.category;
    category.classList.add('gacha-result-category');
  }

  // 기본 정보 (별점, 거리, 가격) 업데이트
  if (infoContainer) {
    infoContainer.classList.add('gacha-result-info');
    infoContainer.innerHTML = `
      <span class="flex items-center gap-1 text-sm text-gray-600">
        <span aria-hidden="true">⭐</span>
        <span class="font-semibold">${restaurant.rating}</span>
      </span>
      ${restaurant.distance && restaurant.distance !== '-' ? `
      <span class="flex items-center gap-1 text-sm text-gray-600">
        <span aria-hidden="true">📍</span>
        <span>${restaurant.distance}</span>
      </span>
      ` : ''}
      ${restaurant.price && restaurant.price !== '-' ? `
      <span class="flex items-center gap-1 text-sm text-gray-600">
        <span aria-hidden="true">💰</span>
        <span>${restaurant.price}</span>
      </span>
      ` : ''}
    `;
  }

  // 주소 정보 업데이트
  if (addressContainer) {
    if (restaurant.address) {
      addressContainer.classList.remove('hidden');
      addressContainer.classList.add('gacha-result-address');
      addressContainer.innerHTML = `
        <div class="flex items-start gap-2 text-sm text-gray-500">
          <span aria-hidden="true" class="flex-shrink-0">🏠</span>
          <span class="text-left">${restaurant.address}</span>
        </div>
        ${restaurant.telephone ? `
        <div class="flex items-center gap-2 text-sm text-gray-500 mt-1">
          <span aria-hidden="true">📞</span>
          <a href="tel:${restaurant.telephone}" class="text-primary hover:underline">${restaurant.telephone}</a>
        </div>
        ` : ''}
      `;
    } else {
      addressContainer.classList.add('hidden');
    }
  }

  // 최근 리뷰 표시 (더미 데이터 또는 실제 데이터)
  if (reviewContainer) {
    const sampleReviews = [
      '정말 맛있어요! 다음에 또 방문할게요 👍',
      '분위기도 좋고 음식도 훌륭합니다 ✨',
      '가성비 최고! 강력 추천합니다 💯',
      '친절한 서비스와 맛있는 음식 🥰',
      '점심 특선이 정말 좋아요 🍽️'
    ];
    const randomReview = sampleReviews[Math.floor(Math.random() * sampleReviews.length)];

    reviewContainer.classList.remove('hidden');
    reviewContainer.classList.add('gacha-result-review');
    reviewContainer.innerHTML = `
      <div class="bg-bg-secondary rounded-xl p-4 text-left">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-semibold text-gray-500">💬 최근 리뷰</span>
          <span class="flex text-amber-400 text-xs">⭐⭐⭐⭐⭐</span>
        </div>
        <p class="text-sm text-gray-700 leading-relaxed">"${randomReview}"</p>
      </div>
    `;
  }

  // Add animation classes to badge
  const badge = resultScreen.querySelector('.inline-flex.items-center.gap-1.px-4');
  if (badge) {
    badge.classList.add('gacha-result-badge');
  }

  // Add animation classes to action buttons
  const actions = resultScreen.querySelector('.flex.gap-4.w-full');
  if (actions) {
    actions.classList.add('gacha-result-actions');
  }

  // Add container animation class
  const container = resultScreen.querySelector('.flex.flex-col.items-center');
  if (container) {
    container.classList.add('gacha-result-container');
  }

  selectedRestaurant = restaurant;
}

/**
 * 리뷰 데이터 로드 (API에서)
 */
async function loadRestaurantReviews(restaurantId) {
  try {
    const response = await fetch(`/api/reviews?restaurant_id=${restaurantId}`);
    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      return result.data;
    }
  } catch (error) {
    console.error('리뷰 로드 실패:', error);
  }
  return null;
}

// ===================
// Event Handlers
// ===================
const gachaAnimator = new GachaAnimator();
const confettiSystem = new ConfettiSystem();

function handleGachaButtonClick() {
  if (isSpinning) return;
  isSpinning = true;

  const gachaBtn = document.querySelector('[data-action="gacha"]');
  if (gachaBtn) {
    gachaBtn.classList.add('gacha-btn--spinning');
    gachaBtn.innerHTML = '<span class="gacha-spinner"></span><span>뽑는 중...</span>';
  }

  gachaAnimator.spin().then(result => {
    if (result) {
      // Show result with delay for effect
      setTimeout(() => {
        displayGachaResult(result);
        confettiSystem.burst(40);
        showScreen('gachaResult');

        // Reset button state
        if (gachaBtn) {
          gachaBtn.classList.remove('gacha-btn--spinning');
          gachaBtn.innerHTML = '<span aria-hidden="true">🎰</span><span>뽑기!</span>';
        }
        isSpinning = false;
      }, 500);
    }
  });
}

function handleRetryClick() {
  gachaAnimator.reset();
  confettiSystem.clear();
  showScreen('gacha');
}

function handleSelectClick() {
  const selectBtn = document.querySelector('[data-action="select"]');
  if (selectBtn) {
    selectBtn.classList.add('select-btn--celebrating');
    setTimeout(() => {
      selectBtn.classList.remove('select-btn--celebrating');
      // Navigate to restaurant detail or show confirmation
      alert(`${selectedRestaurant.name}(으)로 결정했어요! 맛있게 드세요! 🎉`);
    }, 500);
  }
}

// ===================
// Initialize
// ===================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize gacha data manager
  gachaDataManager = new GachaDataManager(locationManager);

  // Initialize gacha animator
  gachaAnimator.init();
  confettiSystem.init();

  // Initialize nearby restaurants UI
  nearbyRestaurantsUI = new NearbyRestaurantsUI(locationManager);
  nearbyRestaurantsUI.init();

  // Initialize gacha location search UI
  initGachaLocationSearch();

  // Navigation click handlers
  document.querySelectorAll('[data-nav]').forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      const target = navItem.getAttribute('data-nav');
      if (target === 'home') showScreen('home');
      else if (target === 'restaurants') {
        showScreen('restaurants');
        // 화면 전환 후 UI 초기화 확인
        if (nearbyRestaurantsUI) {
          nearbyRestaurantsUI.setupLocationInput();
        }
      }
      else if (target === 'gacha') {
        gachaAnimator.reset();
        showScreen('gacha');
      }
      else if (target === 'reviews') showScreen('reviews');
    });
  });

  // Action button handlers
  document.querySelectorAll('[data-action]').forEach(actionBtn => {
    actionBtn.addEventListener('click', (e) => {
      const action = actionBtn.getAttribute('data-action');

      switch(action) {
        case 'nearby':
          showScreen('restaurants');
          // 화면 전환 후 UI 초기화 확인
          if (nearbyRestaurantsUI) {
            nearbyRestaurantsUI.setupLocationInput();
          }
          break;
        case 'random':
          gachaAnimator.reset();
          showScreen('gacha');
          break;
        case 'gacha':
          handleGachaButtonClick();
          break;
        case 'retry':
          handleRetryClick();
          break;
        case 'select':
          handleSelectClick();
          break;
        case 'back':
          showScreen('home');
          break;
        case 'filter':
          toggleFilterModal(true);
          break;
        case 'close-modal':
          toggleFilterModal(false);
          break;
        case 'apply-filter':
          toggleFilterModal(false);
          break;
        case 'write':
          showScreen('reviewWrite');
          break;
      }
    });
  });

  // Rating stars interaction
  document.querySelectorAll('[data-rating]').forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-rating'));
      updateRatingStars(rating);
    });
  });

  // Tag selection
  document.querySelectorAll('[data-tag]').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('bg-primary');
      tag.classList.toggle('text-white');
      tag.classList.toggle('bg-gray-100');
      tag.classList.toggle('text-gray-600');
    });
  });
});

// ===================
// Gacha Location Search UI
// ===================
function initGachaLocationSearch() {
  const gachaScreen = document.getElementById('screen-gacha');
  if (!gachaScreen) return;

  // 위치 검색 섹션이 이미 있는지 확인
  if (document.getElementById('gacha-location-section')) return;

  // 가챠 머신 위에 위치 검색 섹션 추가
  const gachaContainer = gachaScreen.querySelector('.flex.flex-col.items-center');
  if (gachaContainer) {
    const locationSection = document.createElement('div');
    locationSection.id = 'gacha-location-section';
    locationSection.className = 'w-full max-w-xs mb-6';
    locationSection.innerHTML = `
      <div class="text-center mb-4">
        <p class="text-sm text-gray-500">어디 주변에서 찾을까요?</p>
      </div>
      <div class="flex gap-2">
        <input
          type="text"
          id="gacha-location-input"
          placeholder="위치 입력 (예: 강남역)"
          class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-secondary transition-colors"
          value=""
        />
        <button
          type="button"
          id="btn-gacha-load"
          class="px-4 py-3 bg-secondary text-white font-semibold rounded-xl hover:bg-secondary-dark transition-colors text-sm"
        >
          불러오기
        </button>
      </div>
      <div id="gacha-location-status" class="mt-2 text-xs text-center text-gray-400"></div>
    `;

    // 첫 번째 자식 앞에 삽입
    gachaContainer.insertBefore(locationSection, gachaContainer.firstChild);

    // 이벤트 리스너 설정
    setupGachaLocationEventListeners();
  }
}

function setupGachaLocationEventListeners() {
  const loadBtn = document.getElementById('btn-gacha-load');
  const locationInput = document.getElementById('gacha-location-input');

  if (loadBtn) {
    loadBtn.addEventListener('click', handleGachaLocationLoad);
  }

  if (locationInput) {
    locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleGachaLocationLoad();
      }
    });
  }
}

async function handleGachaLocationLoad() {
  const locationInput = document.getElementById('gacha-location-input');
  const statusEl = document.getElementById('gacha-location-status');
  const loadBtn = document.getElementById('btn-gacha-load');

  const location = locationInput?.value.trim();

  if (!location) {
    if (statusEl) {
      statusEl.textContent = '위치를 입력해 주세요';
      statusEl.className = 'mt-2 text-xs text-center text-red-500';
    }
    return;
  }

  // 로딩 상태 표시
  if (loadBtn) {
    loadBtn.disabled = true;
    loadBtn.innerHTML = '<span class="gacha-spinner-small"></span>';
  }
  if (statusEl) {
    statusEl.textContent = '식당 목록을 불러오는 중...';
    statusEl.className = 'mt-2 text-xs text-center text-gray-500';
  }

  try {
    const restaurants = await gachaDataManager.loadRestaurantsForGacha(location);

    if (restaurants && restaurants.length > 0) {
      // 가챠 애니메이터 이모지 새로고침
      gachaAnimator.refreshEmojis();
      gachaAnimator.updateReelItems();

      if (statusEl) {
        statusEl.textContent = `✅ ${location} 주변 ${restaurants.length}개 식당이 준비되었습니다!`;
        statusEl.className = 'mt-2 text-xs text-center text-green-600';
      }
    } else {
      if (statusEl) {
        statusEl.textContent = '검색 결과가 없어 기본 목록을 사용합니다';
        statusEl.className = 'mt-2 text-xs text-center text-amber-600';
      }
    }
  } catch (error) {
    console.error('가챠 위치 검색 오류:', error);
    if (statusEl) {
      statusEl.textContent = '검색 실패. 기본 목록을 사용합니다';
      statusEl.className = 'mt-2 text-xs text-center text-amber-600';
    }
  } finally {
    if (loadBtn) {
      loadBtn.disabled = false;
      loadBtn.innerHTML = '불러오기';
    }
  }
}

// ===================
// Helper Functions
// ===================
function toggleFilterModal(show) {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;

  if (show) {
    modal.classList.remove('opacity-0', 'invisible');
    modal.querySelector('.max-w-app').classList.remove('translate-y-full');
  } else {
    modal.classList.add('opacity-0', 'invisible');
    modal.querySelector('.max-w-app').classList.add('translate-y-full');
  }
}

function updateRatingStars(rating) {
  document.querySelectorAll('[data-rating]').forEach(star => {
    const starRating = parseInt(star.getAttribute('data-rating'));
    if (starRating <= rating) {
      star.classList.add('text-amber-400');
      star.classList.remove('text-gray-300');
    } else {
      star.classList.remove('text-amber-400');
      star.classList.add('text-gray-300');
    }
  });
}
