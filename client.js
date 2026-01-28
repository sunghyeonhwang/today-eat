/**
 * 오늘 뭐먹지 - Client Side JavaScript
 * Material Design 3 Expressive Motion Implementation
 */

// ===================
// Restaurant Data (위치 검색으로 채워짐)
// ===================
const defaultRestaurants = [];

// 가챠에 사용할 식당 목록 (위치 검색 결과)
let gachaRestaurants = [];

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
    this.currentRestaurants = []; // 현재 검색 결과 저장
    this.selectedFilters = {
      category: '전체',
      distance: '500m 이내'
    };
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
      
      // 역지오코딩으로 좌표를 주소로 변환
      this.showStatus('주소를 찾는 중...', 'info');
      
      const response = await fetch(`/api/reverse-geocode?latitude=${position.latitude}&longitude=${position.longitude}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '주소 변환에 실패했습니다.');
      }

      // 짧은 주소(구/동 정보)를 입력창에 설정
      const shortAddress = result.data.shortAddress || result.data.address;
      if (locationInput) {
        locationInput.value = shortAddress;
      }

      this.showStatus(`✅ 현재 위치: ${shortAddress}`, 'success');

      // 자동으로 검색 실행
      setTimeout(() => {
        this.searchNearbyRestaurants(shortAddress);
      }, 500);

    } catch (error) {
      console.error('현재 위치 사용 오류:', error);
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
      this.currentRestaurants = result.restaurants; // 검색 결과 저장
      
      console.log('🔍 검색 완료:', {
        location: result.meta.location,
        count: result.restaurants.length,
        restaurants: result.restaurants.map(r => r.name || r.title)
      });
      
      this.renderRestaurantList(result.restaurants, result.meta);
      this.showStatus(`'${result.meta.location}' 주변 음식점 ${result.restaurants.length}개를 찾았습니다.`, 'success');
    } catch (error) {
      this.showErrorState(error.message);
    }
  }

  /**
   * 랜덤 식당 선택
   */
  selectRandomRestaurant() {
    if (!this.currentRestaurants || this.currentRestaurants.length === 0) {
      this.showStatus('검색 결과가 없습니다. 먼저 위치를 검색해 주세요.', 'error');
      return;
    }

    // 버튼 애니메이션 시작
    const randomBtn = document.getElementById('btn-random-select');
    if (randomBtn) {
      randomBtn.disabled = true;
      randomBtn.classList.add('animate-pulse');
      randomBtn.innerHTML = `
        <span class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
        <span>선택 중...</span>
      `;
    }

    // 랜덤 선택 애니메이션 (1초 딜레이)
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * this.currentRestaurants.length);
      const restaurant = this.currentRestaurants[randomIndex];

      console.log('🎲 랜덤 선택:', {
        totalRestaurants: this.currentRestaurants.length,
        selectedIndex: randomIndex,
        selectedRestaurant: restaurant.name || restaurant.title
      });

      // 가챠 결과 형식으로 변환
      const formattedRestaurant = this.formatRestaurantForDisplay(restaurant, randomIndex);

      // 전역 selectedRestaurant 설정
      selectedRestaurant = formattedRestaurant;

      // 버튼 원래 상태로 복구
      if (randomBtn) {
        randomBtn.disabled = false;
        randomBtn.classList.remove('animate-pulse');
        randomBtn.innerHTML = `
          <span aria-hidden="true">🎲</span>
          <span>랜덤으로 선택하기</span>
        `;
      }

      // 선택 확인 모달 표시
      showSelectionConfirmation(formattedRestaurant);
    }, 1000);
  }

  /**
   * 식당 데이터를 가챠 결과 형식으로 변환
   */
  formatRestaurantForDisplay(restaurant, index) {
    const categoryStr = typeof restaurant.category === 'object' && restaurant.category !== null
      ? (restaurant.category.sub || restaurant.category.main || '음식점')
      : (restaurant.category || '음식점');
    
    return {
      id: restaurant.id || `nearby_${index}_${Date.now()}`,
      emoji: this.getCategoryEmoji(categoryStr),
      name: restaurant.name || restaurant.title || '식당명',
      category: categoryStr,
      rating: (Math.random() * 1 + 4).toFixed(1),
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

    // 랜덤 선택 버튼 추가
    const randomButtonHtml = `
      <div class="flex items-center justify-center mb-4">
        <button
          type="button"
          id="btn-random-select"
          class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-secondary to-secondary-dark text-white font-semibold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg"
        >
          <span aria-hidden="true">🎲</span>
          <span>랜덤으로 선택하기</span>
        </button>
      </div>
    `;

    const cardsHtml = restaurants.map((restaurant, index) => this.createRestaurantCard(restaurant, index)).join('');
    this.container.innerHTML = randomButtonHtml + cardsHtml;

    // 랜덤 선택 버튼 이벤트 리스너
    const randomBtn = document.getElementById('btn-random-select');
    if (randomBtn) {
      randomBtn.addEventListener('click', () => this.selectRandomRestaurant());
    }

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
    // category가 객체인 경우 문자열로 변환
    const categoryStr = typeof restaurant.category === 'object' && restaurant.category !== null
      ? (restaurant.category.sub || restaurant.category.main || '음식점')
      : (restaurant.category || '음식점');
    
    const emoji = this.getCategoryEmoji(categoryStr);
    const name = restaurant.name || restaurant.title || '식당명';
    const address = restaurant.address || '';
    const shortAddress = address.length > 30 ? address.substring(0, 30) + '...' : address;

    return `
      <article class="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" data-restaurant-id="${index}">
        <div class="w-20 h-20 bg-bg-secondary rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          <span aria-hidden="true">${emoji}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between mb-1">
            <h3 class="text-base font-semibold text-gray-900 truncate">${name}</h3>
          </div>
          <p class="text-sm text-gray-500 mb-2">${categoryStr}</p>
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
    if (!category || typeof category !== 'string') return '🍽️';

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
    if (!category || typeof category !== 'string') return '🍽️';

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
    // category가 객체인 경우 문자열로 변환
    const categoryStr = typeof restaurant.category === 'object' && restaurant.category !== null
      ? (restaurant.category.sub || restaurant.category.main || '음식점')
      : (restaurant.category || '음식점');
    
    const name = restaurant.name || restaurant.title || '식당명';
    
    return {
      id: index + 1,
      emoji: this.getCategoryEmoji(categoryStr),
      name: name,
      category: categoryStr,
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

    // 리뷰 작성 화면일 때 별점 초기화 (화면 전환 후 실행)
    if (screenName === 'reviewWrite' && reviewWriteUI) {
      setTimeout(() => {
        reviewWriteUI.currentRating = 0;
        reviewWriteUI.updateRatingDisplay(0);
        console.log('⭐ 리뷰 작성 화면 진입 - 별점 초기화 완료');
      }, 50);
    }
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

/**
 * 뒤로가기 버튼 처리 - 현재 화면에 따라 적절한 화면으로 이동
 */
function handleBackAction() {
  switch (currentScreen) {
    case 'reviewWrite':
      // 리뷰 작성 화면에서는 리뷰 목록으로 이동
      showScreen('reviews');
      if (reviewHistoryUI) {
        reviewHistoryUI.loadReviews();
      }
      break;
    case 'restaurants':
    case 'gacha':
    case 'gachaResult':
    case 'reviews':
      // 다른 화면들은 홈으로 이동
      showScreen('home');
      break;
    default:
      // 기본적으로 홈으로 이동
      showScreen('home');
      break;
  }
}

// ===================
// Gacha Animation System
// ===================
class GachaAnimator {
  constructor() {
    this.slotWindow = null;
    this.reelContainer = null;
    // 다양한 음식 이모지 (결과 예측 방지용)
    this.defaultEmojis = [
      '🍛', '🍜', '🍕', '🍔', '🍣', '🍲', '🍝', '🌮', '🍱', '🥗',
      '🍰', '🍩', '🍿', '🥘', '🍗', '🥩', '🌯', '🥪', '🍤', '🍙',
      '🍚', '🍘', '🥟', '🍢', '🍡', '🥠', '🍧', '🍨', '🎂', '🥧',
      '🍪', '🍫', '🍬', '🍭', '🧁', '🥮', '🍯', '🥐', '🥖', '🥨',
      '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥯', '🍖', '🦴', '🌭'
    ];
    this.emojis = [...this.defaultEmojis];
    this.spinDuration = 2500;
    this.isAnimating = false;
    this.anticipationDuration = 500;
    this.nearbyRestaurants = []; // 위치 기반 검색 결과
    this.currentLocation = null; // 현재 위치
  }

  /**
   * 이모지 목록 업데이트 (항상 다양한 이모지 사용)
   */
  refreshEmojis() {
    // 기본 이모지 셔플
    this.emojis = [...this.defaultEmojis].sort(() => Math.random() - 0.5);
  }
  
  /**
   * 위치 설정
   */
  setLocation(location) {
    this.currentLocation = location;
    console.log('🎰 가챠 위치 설정:', location);
  }
  
  /**
   * 주변 음식점 검색
   */
  async searchNearbyRestaurants() {
    if (!this.currentLocation) {
      throw new Error('위치를 먼저 설정해주세요');
    }
    
    try {
      const params = new URLSearchParams({
        query: '맛집',
        latitude: this.currentLocation.latitude,
        longitude: this.currentLocation.longitude,
        radius: 1000,
        display: 20
      });
      
      const response = await fetch(`/api/nearby-restaurants?${params}`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        this.nearbyRestaurants = result.data;
        console.log('🎰 주변 음식점 검색 완료:', this.nearbyRestaurants.length, '개');
        return this.nearbyRestaurants;
      } else {
        throw new Error('주변 음식점을 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('주변 음식점 검색 실패:', error);
      throw error;
    }
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

    // 이모지 목록 새로고침 (다양한 이모지로)
    this.refreshEmojis();

    let selected;
    
    // 위치 기반 주변 음식점에서 선택
    if (this.nearbyRestaurants.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.nearbyRestaurants.length);
      const restaurant = this.nearbyRestaurants[randomIndex];
      
      // 카테고리에서 이모지 추출
      const categoryStr = typeof restaurant.category === 'object' 
        ? (restaurant.category.sub || restaurant.category.main || '음식점')
        : (restaurant.category || '음식점');
      
      selected = {
        id: restaurant.id || `nearby-${randomIndex}`,
        name: restaurant.name,
        emoji: this.getCategoryEmoji(categoryStr),
        category: categoryStr,
        address: restaurant.address,
        telephone: restaurant.telephone,
        coordinates: restaurant.coordinates
      };
    } else {
      // 주변 음식점이 없으면 기본 데이터 사용
      const randomIndex = Math.floor(Math.random() * gachaRestaurants.length);
      selected = gachaRestaurants[randomIndex];
    }

    // Update reel with random emojis (결과 예측 불가)
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
    const targetPosition = -20 * itemHeight;
    this.reel.style.transition = 'transform 1.2s cubic-bezier(0.05, 0.7, 0.1, 1)';
    this.reel.style.transform = `translateY(${targetPosition}px)`;

    await this.delay(1200);

    // Phase 3: Reveal - 자연스럽게 중앙으로 이동
    this.slotWindow.classList.remove('gacha-machine--stopping');
    this.slotWindow.classList.add('gacha-machine--revealed');

    // 부드럽게 결과 표시 (스케일 애니메이션과 함께)
    this.reel.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    this.reel.style.opacity = '0';
    
    await this.delay(150);
    
    // 선택된 이모지만 표시
    this.reel.innerHTML = `<div class="gacha-reel-item emoji-slot-item selected">${selected.emoji}</div>`;
    this.reel.style.transform = 'translateY(0) scale(1.1)';
    this.reel.style.opacity = '1';
    
    await this.delay(200);
    
    // 최종 위치로 안착
    this.reel.style.transition = 'transform 0.2s ease-out';
    this.reel.style.transform = 'translateY(0) scale(1)';

    // Trigger particle burst
    this.triggerParticleBurst();

    // Add glow effect on result
    this.addGlowEffect();

    this.isAnimating = false;
    return selected;
  }
  
  /**
   * 카테고리에 맞는 이모지 반환
   */
  getCategoryEmoji(category) {
    const emojiMap = {
      '한식': '🍚', '일식': '🍣', '중식': '🥟', '양식': '🍝',
      '카페': '☕', '분식': '🍜', '치킨': '🍗', '피자': '🍕',
      '버거': '🍔', '아시안': '🍛', '멕시칸': '🌮', '베트남': '🍜',
      '태국': '🍛', '인도': '🍛', '샐러드': '🥗', '디저트': '🍰',
      '빵': '🥐', '고기': '🥩', '해산물': '🦐', '국수': '🍜',
      '카레': '🍛', '초밥': '🍣', '라멘': '🍜', '우동': '🍜',
      '짜장': '🍜', '짬뽕': '🍜', '탕수육': '🥟', '파스타': '🍝'
    };
    
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (category && category.includes(key)) {
        return emoji;
      }
    }
    return '🍽️';
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

  // 기본 정보 (거리) 업데이트 - 별점은 네이버 API에서 제공하지 않음
  if (infoContainer) {
    infoContainer.classList.add('gacha-result-info');
    const infoItems = [];
    
    // 거리 정보
    if (restaurant.distance && restaurant.distance !== '-') {
      infoItems.push(`
        <span class="flex items-center gap-1 text-sm text-gray-600">
          <span aria-hidden="true">📍</span>
          <span>${restaurant.distance}</span>
        </span>
      `);
    }
    
    // 카테고리 정보
    if (restaurant.category) {
      infoItems.push(`
        <span class="flex items-center gap-1 text-sm text-gray-600">
          <span aria-hidden="true">🍽️</span>
          <span>${restaurant.category}</span>
        </span>
      `);
    }
    
    infoContainer.innerHTML = infoItems.join('');
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

  // 리뷰 컨테이너 숨기기 (리뷰가 없으면 표시하지 않음)
  if (reviewContainer) {
    reviewContainer.classList.add('hidden');
    reviewContainer.innerHTML = '';
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
  
  // 주변 음식점이 없으면 경고
  if (!gachaAnimator.nearbyRestaurants || gachaAnimator.nearbyRestaurants.length === 0) {
    const statusEl = document.getElementById('gacha-location-status');
    if (statusEl) {
      statusEl.textContent = '⚠️ 먼저 위치를 입력하고 불러오기를 눌러주세요!';
      statusEl.className = 'mt-2 text-xs text-center text-red-500 font-semibold animate-pulse';
    }
    // 위치 입력창에 포커스
    const locationInput = document.getElementById('gacha-location-input');
    if (locationInput) {
      locationInput.focus();
      locationInput.classList.add('border-red-500');
      setTimeout(() => locationInput.classList.remove('border-red-500'), 2000);
    }
    return;
  }
  
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
    } else {
      // 결과가 없으면 버튼 상태 복원
      if (gachaBtn) {
        gachaBtn.classList.remove('gacha-btn--spinning');
        gachaBtn.innerHTML = '<span aria-hidden="true">🎰</span><span>뽑기!</span>';
      }
      isSpinning = false;
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

      // 식당 선택 확인 및 리뷰 작성 옵션 표시
      if (selectedRestaurant) {
        showSelectionConfirmation(selectedRestaurant);
      }
    }, 500);
  }
}

/**
 * 식당 선택 확인 모달 표시
 */
function showSelectionConfirmation(restaurant) {
  // 기존 모달 제거
  const existingModal = document.getElementById('selection-confirm-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'selection-confirm-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[300] opacity-0 transition-opacity';
  modal.innerHTML = `
    <div class="w-[90%] max-w-sm bg-white rounded-2xl shadow-xl transform scale-95 transition-transform overflow-hidden">
      <div class="p-6 text-center">
        <div class="text-6xl mb-4">${restaurant.emoji || '🍽️'}</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">${restaurant.name}</h3>
        <p class="text-gray-500 mb-6">맛있게 드셨나요? 리뷰를 남겨보세요!</p>
        <div class="flex flex-col gap-3">
          <button type="button" class="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors" id="btn-write-review">
            ✏️ 리뷰 작성하기
          </button>
          <button type="button" class="w-full py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors" id="btn-close-confirm">
            나중에 할게요
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 애니메이션으로 표시
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    modal.querySelector('.bg-white').classList.remove('scale-95');
    modal.classList.add('scale-100');
  });

  // 이벤트 리스너
  document.getElementById('btn-write-review').addEventListener('click', () => {
    closeSelectionConfirmation();
    // 리뷰 작성 화면으로 이동
    if (reviewWriteUI) {
      reviewWriteUI.resetForm();
      reviewWriteUI.setRestaurant(restaurant);
    }
    showScreen('reviewWrite');
  });

  document.getElementById('btn-close-confirm').addEventListener('click', () => {
    closeSelectionConfirmation();
    // 홈 화면으로 이동
    showScreen('home');
  });

  // 배경 클릭 시 닫기
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeSelectionConfirmation();
    }
  });
}

/**
 * 선택 확인 모달 닫기
 */
function closeSelectionConfirmation() {
  const modal = document.getElementById('selection-confirm-modal');
  if (modal) {
    modal.classList.add('opacity-0');
    modal.querySelector('.bg-white')?.classList.add('scale-95');
    setTimeout(() => modal.remove(), 200);
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

  // Initialize review history UI
  reviewHistoryUI = new ReviewHistoryUI();
  reviewHistoryUI.init();

  // Initialize review write UI
  reviewWriteUI = new ReviewWriteUI();
  reviewWriteUI.init();

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
      else if (target === 'reviews') {
        showScreen('reviews');
        // 리뷰 목록 로드
        if (reviewHistoryUI) {
          reviewHistoryUI.loadReviews();
        }
      }
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
          handleBackAction();
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
          // 리뷰 작성 화면으로 이동
          if (reviewWriteUI) {
            reviewWriteUI.resetForm();
            // 선택된 식당이 있으면 폼에 설정
            if (selectedRestaurant) {
              reviewWriteUI.setRestaurant(selectedRestaurant);
            }
          }
          showScreen('reviewWrite');
          break;
      }
    });
  });

  // Note: Rating stars and tag selection are now handled by ReviewWriteUI class
  // The class handles click, hover effects, and state management properly
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
      <div class="flex gap-2 items-center">
        <button
          type="button"
          id="btn-gacha-gps"
          class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-lg"
          title="현재 위치 사용"
        >
          📍
        </button>
        <input
          type="text"
          id="gacha-location-input"
          placeholder="위치 입력"
          class="flex-1 min-w-0 px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-secondary transition-colors"
          value=""
        />
        <button
          type="button"
          id="btn-gacha-load"
          class="flex-shrink-0 px-3 py-2.5 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary-dark transition-colors text-sm whitespace-nowrap"
        >
          검색
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
  const gpsBtn = document.getElementById('btn-gacha-gps');

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
  
  // GPS 버튼 클릭 이벤트
  if (gpsBtn) {
    gpsBtn.addEventListener('click', handleGachaGpsClick);
  }
}

/**
 * 가챠 GPS 위치 불러오기
 */
async function handleGachaGpsClick() {
  const gpsBtn = document.getElementById('btn-gacha-gps');
  const locationInput = document.getElementById('gacha-location-input');
  const statusEl = document.getElementById('gacha-location-status');
  
  if (!navigator.geolocation) {
    if (statusEl) {
      statusEl.textContent = '이 브라우저에서는 GPS를 지원하지 않습니다';
      statusEl.className = 'mt-2 text-xs text-center text-red-500';
    }
    return;
  }
  
  // 로딩 상태 표시
  if (gpsBtn) {
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = '⏳';
  }
  if (statusEl) {
    statusEl.textContent = '현재 위치를 가져오는 중...';
    statusEl.className = 'mt-2 text-xs text-center text-gray-500';
  }
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    
    const { latitude, longitude } = position.coords;
    
    // 역지오코딩으로 주소 가져오기
    if (statusEl) {
      statusEl.textContent = '주소를 변환하는 중...';
    }
    
    const response = await fetch(`/api/reverse-geocode?latitude=${latitude}&longitude=${longitude}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const address = result.data.shortAddress || result.data.address;
      if (locationInput) {
        locationInput.value = address;
      }
      
      // 가챠 애니메이터에 좌표 저장
      gachaAnimator.currentLocation = { latitude, longitude };
      
      if (statusEl) {
        statusEl.textContent = `📍 ${address}`;
        statusEl.className = 'mt-2 text-xs text-center text-green-600';
      }
      
      // 자동으로 음식점 불러오기
      handleGachaLocationLoad();
    } else {
      throw new Error('주소 변환 실패');
    }
  } catch (error) {
    console.error('GPS 위치 가져오기 실패:', error);
    if (statusEl) {
      statusEl.textContent = error.code === 1 
        ? '위치 권한이 거부되었습니다' 
        : '위치를 가져올 수 없습니다';
      statusEl.className = 'mt-2 text-xs text-center text-red-500';
    }
  } finally {
    if (gpsBtn) {
      gpsBtn.disabled = false;
      gpsBtn.innerHTML = '📍';
    }
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
    // 위치 기반 주변 식당 검색
    const result = await locationManager.fetchNearbyRestaurants(location, '', 20);
    
    if (result.restaurants && result.restaurants.length > 0) {
      // 가챠 애니메이터에 주변 음식점 저장
      gachaAnimator.nearbyRestaurants = result.restaurants;
      gachaAnimator.currentLocation = result.coordinates;
      
      // 가챠 애니메이터 이모지 새로고침
      gachaAnimator.refreshEmojis();
      gachaAnimator.updateReelItems();

      if (statusEl) {
        statusEl.textContent = `✅ ${location} 주변 ${result.restaurants.length}개 식당이 준비되었습니다!`;
        statusEl.className = 'mt-2 text-xs text-center text-green-600';
      }
      
      console.log('🎰 가챠 주변 음식점 로드 완료:', result.restaurants.length, '개');
    } else {
      // 검색 결과 없음
      gachaAnimator.nearbyRestaurants = [];
      if (statusEl) {
        statusEl.textContent = '검색 결과가 없습니다. 다른 위치를 입력해주세요.';
        statusEl.className = 'mt-2 text-xs text-center text-amber-600';
      }
    }
  } catch (error) {
    console.error('가챠 위치 검색 오류:', error);
    gachaAnimator.nearbyRestaurants = [];
    if (statusEl) {
      statusEl.textContent = '검색 실패. 다시 시도해주세요.';
      statusEl.className = 'mt-2 text-xs text-center text-red-500';
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
    // 필터 옵션 이벤트 리스너 설정
    setupFilterOptions();
  } else {
    modal.classList.add('opacity-0', 'invisible');
    modal.querySelector('.max-w-app').classList.add('translate-y-full');
  }
}

/**
 * 필터 옵션 이벤트 리스너 설정
 */
function setupFilterOptions() {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;

  // 필터 상태 저장
  let selectedFilters = {
    category: '전체',
    distance: '500m 이내'
  };

  // 모든 필터 버튼 찾기
  const filterSections = modal.querySelectorAll('.mb-6');
  
  filterSections.forEach((section, sectionIndex) => {
    const buttons = section.querySelectorAll('button[type="button"]:not([data-action])');
    
    buttons.forEach(button => {
      // 기존 이벤트 리스너 제거 방지
      if (button.dataset.filterSetup) return;
      button.dataset.filterSetup = 'true';

      button.addEventListener('click', () => {
        // 같은 그룹 내의 다른 버튼 비활성화
        buttons.forEach(btn => {
          btn.classList.remove('bg-primary', 'text-white');
          btn.classList.add('bg-gray-100', 'text-gray-600');
        });

        // 현재 버튼 활성화
        button.classList.remove('bg-gray-100', 'text-gray-600');
        button.classList.add('bg-primary', 'text-white');

        // 선택된 필터 저장
        const filterValue = button.textContent.trim();
        if (sectionIndex === 0) selectedFilters.category = filterValue;
        else if (sectionIndex === 1) selectedFilters.distance = filterValue;
      });
    });
  });

  // "필터 적용하기" 버튼 이벤트
  const applyButton = modal.querySelector('[data-action="apply-filter"]');
  if (applyButton && !applyButton.dataset.filterApplySetup) {
    applyButton.dataset.filterApplySetup = 'true';
    applyButton.addEventListener('click', () => {
      console.log('🔍 필터 적용:', selectedFilters);
      
      // 필터 적용 (카테고리만 구현, 거리와 가격은 추후 구현)
      if (nearbyRestaurantsUI && nearbyRestaurantsUI.currentLocation) {
        const category = selectedFilters.category === '전체' ? '' : selectedFilters.category;
        nearbyRestaurantsUI.searchNearbyRestaurants(
          nearbyRestaurantsUI.currentLocation,
          category
        );
      }
      
      toggleFilterModal(false);
    });
  }
}

// ===================
// Review History UI Manager
// ===================
class ReviewHistoryUI {
  constructor() {
    this.container = null;
    this.reviews = [];
    this.sessionId = null;
    this.isLoading = false;
    this.currentSort = 'date'; // 'date' or 'rating'
    this.sortOrder = 'desc'; // 'desc' or 'asc'
  }

  /**
   * 세션 ID 생성 또는 가져오기
   */
  getSessionId() {
    let sessionId = localStorage.getItem('what_eat_today_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('what_eat_today_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * 초기화
   */
  init() {
    this.container = document.getElementById('reviews-list-container');
    this.sessionId = this.getSessionId();
    this.setupFilterListeners();
  }

  /**
   * 필터/정렬 버튼 이벤트 리스너 설정
   */
  setupFilterListeners() {
    // 정렬 버튼 이벤트 리스너
    document.querySelectorAll('[data-sort-reviews]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sortType = btn.getAttribute('data-sort-reviews');
        this.handleSort(sortType, btn);
      });
    });
  }

  /**
   * 정렬 처리
   */
  handleSort(sortType, clickedBtn) {
    // 이미 선택된 정렬인 경우 순서 토글
    if (this.currentSort === sortType) {
      this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      this.currentSort = sortType;
      this.sortOrder = 'desc';
    }

    // UI 상태 업데이트
    document.querySelectorAll('[data-sort-reviews]').forEach(btn => {
      btn.classList.remove('bg-primary', 'text-white');
      btn.classList.add('bg-gray-100', 'text-gray-600');
    });
    clickedBtn.classList.remove('bg-gray-100', 'text-gray-600');
    clickedBtn.classList.add('bg-primary', 'text-white');

    // 정렬 아이콘 업데이트
    const arrow = this.sortOrder === 'desc' ? '↓' : '↑';
    const labelMap = { date: '날짜순', rating: '평점순' };
    clickedBtn.innerHTML = `${labelMap[sortType]} ${arrow}`;

    // 리뷰 다시 렌더링
    this.sortAndRenderReviews();
  }

  /**
   * 리뷰 정렬 및 렌더링
   */
  sortAndRenderReviews() {
    const sortedReviews = [...this.reviews].sort((a, b) => {
      let comparison = 0;
      if (this.currentSort === 'date') {
        comparison = new Date(b.created_at) - new Date(a.created_at);
      } else if (this.currentSort === 'rating') {
        comparison = parseFloat(b.rating) - parseFloat(a.rating);
      }
      return this.sortOrder === 'desc' ? comparison : -comparison;
    });

    this.renderReviewList(sortedReviews);
  }

  /**
   * 리뷰 목록 로드
   */
  async loadReviews() {
    if (this.isLoading) return;
    this.isLoading = true;

    this.showLoadingState();

    try {
      const params = new URLSearchParams({
        session_id: this.sessionId,
        limit: '50',
        offset: '0'
      });

      const response = await fetch(`/api/reviews/my?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '리뷰를 불러오는데 실패했습니다.');
      }

      this.reviews = result.data || [];
      this.sortAndRenderReviews();
    } catch (error) {
      console.error('리뷰 로드 오류:', error);
      this.reviews = [];
      this.sortAndRenderReviews();
    } finally {
      this.isLoading = false;
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
        <p class="text-gray-500">리뷰를 불러오는 중...</p>
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
        <h3 class="text-lg font-semibold text-gray-700 mb-2">불러오기 실패</h3>
        <p class="text-sm text-gray-500 mb-6">${message}</p>
        <button
          type="button"
          class="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          onclick="reviewHistoryUI.loadReviews()"
        >
          다시 시도
        </button>
      </div>
    `;
  }

  /**
   * 빈 상태 표시
   */
  showEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <span class="text-6xl mb-4 opacity-50" aria-hidden="true">📝</span>
        <h3 class="text-lg font-semibold text-gray-700 mb-2">아직 리뷰가 없어요</h3>
        <p class="text-sm text-gray-500 mb-6">맛집에 방문하고 첫 리뷰를 남겨보세요!</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white text-base font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          data-action="write"
        >
          <span aria-hidden="true">✏️</span>
          <span>리뷰 작성하기</span>
        </button>
      </div>
    `;

    // 빈 상태에서 리뷰 작성 버튼 이벤트 리스너 추가
    const writeBtn = this.container.querySelector('[data-action="write"]');
    if (writeBtn) {
      writeBtn.addEventListener('click', () => showScreen('reviewWrite'));
    }
  }

  /**
   * 날짜 포맷팅 (2025년 1월 25일 형식)
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  /**
   * 날짜 그룹 라벨 생성 (오늘, 이번 주, 이번 달, 이전)
   */
  getDateGroupLabel(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return '이번 주';
    if (diffDays < 30) return '이번 달';
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  }

  /**
   * 별점 HTML 생성
   */
  createStarsHtml(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
      stars += '⭐';
    }

    // 반 별은 빈 별로 표시 (간단하게 처리)
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    if (hasHalfStar) {
      stars += '⭐';
    }

    return stars || '⭐';
  }

  /**
   * 카테고리 이모지 반환
   */
  getCategoryEmoji(category) {
    if (!category || typeof category !== 'string') return '🍽️';

    const categoryLower = category.toLowerCase();
    const emojiMap = {
      '한식': '🍲', '일식': '🍣', '중식': '🥟', '양식': '🍝',
      '분식': '🍜', '치킨': '🍗', '피자': '🍕', '버거': '🍔',
      '카페': '☕', '베이커리': '🥐', '디저트': '🍰', '술집': '🍺',
      '고기': '🥩', '해산물': '🦐', '샐러드': '🥗', '멕시칸': '🌮',
      '태국': '🍛', '베트남': '🍜', '인도': '🍛', '국수': '🍜',
      '카레': '🍛', '초밥': '🍣', '라멘': '🍜', '찌개': '🍲'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (categoryLower.includes(key)) {
        return emoji;
      }
    }

    return '🍽️';
  }

  /**
   * 태그 이모지 반환
   */
  getTagEmoji(tag) {
    const tagEmojiMap = {
      'tasty': '👍', '맛있어요': '👍',
      'value': '💰', '가성비': '💰', '가성비 좋아요': '💰',
      'portion': '🍽️', '양이 많아요': '🍽️',
      'kind': '😊', '친절해요': '😊',
      'ambiance': '🪑', '분위기 좋아요': '🪑',
      'parking': '🅿️', '주차 편해요': '🅿️',
      'fast': '⏱️', '빨라요': '⏱️',
      'healthy': '🌱', '건강해요': '🌱'
    };

    const tagLower = tag.toLowerCase();
    for (const [key, emoji] of Object.entries(tagEmojiMap)) {
      if (tagLower.includes(key) || key.includes(tagLower)) {
        return emoji;
      }
    }
    return '🏷️';
  }

  /**
   * 태그 표시 텍스트 반환
   */
  formatTagText(tag) {
    const tagTextMap = {
      'tasty': '맛있어요',
      'value': '가성비 좋아요',
      'portion': '양이 많아요',
      'kind': '친절해요',
      'ambiance': '분위기 좋아요',
      'parking': '주차 편해요',
      'fast': '빨라요',
      'healthy': '건강해요'
    };

    return tagTextMap[tag] || tag;
  }

  /**
   * 리뷰 카드 HTML 생성
   */
  createReviewCard(review) {
    const restaurant = review.restaurant || {};
    const emoji = restaurant.emoji || this.getCategoryEmoji(restaurant.category);
    const restaurantName = restaurant.name || '알 수 없는 식당';
    const category = restaurant.category || '';
    const date = this.formatDate(review.created_at);
    const rating = parseFloat(review.rating) || 0;
    const content = review.content || '';
    const tags = review.tags || [];

    const starsHtml = this.createStarsHtml(rating);
    const tagsHtml = tags.map(tag => {
      const tagEmoji = this.getTagEmoji(tag);
      const tagText = this.formatTagText(tag);
      return `<span class="px-2 py-1 bg-bg-secondary rounded text-xs text-gray-600">${tagEmoji} ${tagText}</span>`;
    }).join('');

    return `
      <article class="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all" data-review-id="${review.id}">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 bg-bg-secondary rounded-lg flex items-center justify-center text-xl flex-shrink-0">
            <span aria-hidden="true">${emoji}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-gray-900 truncate">${restaurantName}</p>
            <p class="text-xs text-gray-400">${date}${category ? ` · ${category}` : ''}</p>
          </div>
          <div class="flex gap-0.5 text-sm text-amber-500 flex-shrink-0">
            <span>${starsHtml}</span>
          </div>
        </div>
        ${content ? `
        <p class="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
          ${content}
        </p>
        ` : ''}
        ${tags.length > 0 ? `
        <div class="flex flex-wrap gap-1">
          ${tagsHtml}
        </div>
        ` : ''}
      </article>
    `;
  }

  /**
   * 리뷰 목록 렌더링 (날짜별 그룹화)
   */
  renderReviewList(reviews) {
    if (!this.container) return;

    if (!reviews || reviews.length === 0) {
      this.showEmptyState();
      return;
    }

    // 날짜별 그룹화
    const groupedReviews = {};
    reviews.forEach(review => {
      const groupLabel = this.getDateGroupLabel(review.created_at);
      if (!groupedReviews[groupLabel]) {
        groupedReviews[groupLabel] = [];
      }
      groupedReviews[groupLabel].push(review);
    });

    // HTML 생성
    let html = '';
    for (const [groupLabel, groupReviews] of Object.entries(groupedReviews)) {
      html += `
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-gray-500 mb-3 px-1">${groupLabel}</h3>
          <div class="flex flex-col gap-4">
            ${groupReviews.map(review => this.createReviewCard(review)).join('')}
          </div>
        </div>
      `;
    }

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
}

// Global review history UI instance
let reviewHistoryUI = null;

// ===================
// Review Write UI Manager
// ===================
class ReviewWriteUI {
  constructor() {
    this.formContainer = null;
    this.currentRating = 0;
    this.selectedTags = new Set();
    this.sessionId = null;
    this.isSubmitting = false;
  }

  /**
   * 세션 ID 생성 또는 가져오기
   */
  getSessionId() {
    let sessionId = localStorage.getItem('what_eat_today_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('what_eat_today_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * 초기화
   */
  init() {
    this.sessionId = this.getSessionId();
    this.formContainer = document.querySelector('[data-form="review"]');
    this.setupEventListeners();
    // 별점 초기화
    this.currentRating = 0;
    this.updateRatingDisplay(0);
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 별점 선택 이벤트
    document.querySelectorAll('[data-rating]').forEach(star => {
      star.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rating = parseInt(star.getAttribute('data-rating'));
        console.log('⭐ 별점 클릭:', rating);
        this.setRating(rating);
      });

      // 호버 효과
      star.addEventListener('mouseenter', (e) => {
        const rating = parseInt(star.getAttribute('data-rating'));
        this.previewRating(rating);
      });

      star.addEventListener('mouseleave', () => {
        this.updateRatingDisplay(this.currentRating);
      });
    });

    // 태그 선택 이벤트
    document.querySelectorAll('[data-tag]').forEach(tag => {
      tag.addEventListener('click', () => {
        this.toggleTag(tag);
      });
    });

    // 폼 제출 이벤트
    if (this.formContainer) {
      this.formContainer.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // 저장 버튼 이벤트 (헤더의 저장 버튼)
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  /**
   * 별점 설정
   */
  setRating(rating) {
    this.currentRating = rating;
    console.log('⭐ 별점 설정됨:', rating);
    this.updateRatingDisplay(rating);
  }

  /**
   * 별점 미리보기 (호버 시)
   */
  previewRating(rating) {
    const reviewScreen = document.getElementById('screen-review-write');
    if (!reviewScreen) return;
    
    reviewScreen.querySelectorAll('[data-rating]').forEach(star => {
      const starRating = parseInt(star.getAttribute('data-rating'));
      star.classList.remove('text-amber-400', 'text-gray-300');
      if (starRating <= rating) {
        star.classList.add('text-amber-400');
      } else {
        star.classList.add('text-gray-300');
      }
    });
  }

  /**
   * 별점 표시 업데이트
   */
  updateRatingDisplay(rating) {
    console.log('⭐ 별점 표시 업데이트:', rating);
    // 리뷰 작성 화면 내의 별만 선택
    const reviewScreen = document.getElementById('screen-review-write');
    if (!reviewScreen) {
      console.log('⭐ 리뷰 작성 화면을 찾을 수 없음');
      return;
    }
    
    const stars = reviewScreen.querySelectorAll('[data-rating]');
    console.log('⭐ 별 개수:', stars.length);
    
    stars.forEach(star => {
      const starRating = parseInt(star.getAttribute('data-rating'));
      // 강제로 클래스 초기화 후 적용
      star.classList.remove('text-amber-400', 'text-gray-300');
      if (starRating <= rating && rating > 0) {
        star.classList.add('text-amber-400');
      } else {
        star.classList.add('text-gray-300');
      }
    });
  }

  /**
   * 태그 토글
   */
  toggleTag(tagElement) {
    const tagValue = tagElement.getAttribute('data-tag');

    if (this.selectedTags.has(tagValue)) {
      this.selectedTags.delete(tagValue);
      tagElement.classList.remove('bg-primary', 'text-white');
      tagElement.classList.add('bg-gray-100', 'text-gray-600');
    } else {
      this.selectedTags.add(tagValue);
      tagElement.classList.remove('bg-gray-100', 'text-gray-600');
      tagElement.classList.add('bg-primary', 'text-white');
    }
  }

  /**
   * 리뷰 화면에 식당 정보 설정
   */
  setRestaurant(restaurant) {
    const reviewScreen = document.getElementById('screen-review-write');
    if (!reviewScreen || !restaurant) return;

    // 식당 정보 영역 찾기
    const restaurantInfoContainer = reviewScreen.querySelector('[data-form="review"] > div:first-child');
    if (restaurantInfoContainer) {
      const infoBox = restaurantInfoContainer.querySelector('.flex.items-center.gap-4');
      if (infoBox) {
        // category가 객체인 경우 문자열로 변환
        const categoryStr = typeof restaurant.category === 'object' && restaurant.category !== null
          ? (restaurant.category.sub || restaurant.category.main || '음식점')
          : (restaurant.category || '음식점');
        
        const emoji = restaurant.emoji || this.getCategoryEmoji(categoryStr);
        const name = restaurant.name || restaurant.title || '식당명';

        infoBox.innerHTML = `
          <div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xl">
            <span aria-hidden="true">${emoji}</span>
          </div>
          <div>
            <p class="text-base font-semibold text-gray-900">${name}</p>
            <p class="text-sm text-gray-500">${categoryStr}</p>
          </div>
        `;
      }
    }
  }

  /**
   * 카테고리에 맞는 이모지 반환
   */
  getCategoryEmoji(category) {
    if (!category || typeof category !== 'string') return '🍽️';

    const categoryLower = category.toLowerCase();
    const emojiMap = {
      '한식': '🍲', '일식': '🍣', '중식': '🥟', '양식': '🍝',
      '분식': '🍜', '치킨': '🍗', '피자': '🍕', '버거': '🍔',
      '카페': '☕', '베이커리': '🥐', '디저트': '🍰', '술집': '🍺',
      '고기': '🥩', '해산물': '🦐', '샐러드': '🥗', '멕시칸': '🌮',
      '태국': '🍛', '베트남': '🍜', '인도': '🍛', '국수': '🍜',
      '카레': '🍛', '초밥': '🍣', '라멘': '🍜', '찌개': '🍲'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (categoryLower.includes(key)) {
        return emoji;
      }
    }

    return '🍽️';
  }

  /**
   * 폼 초기화
   */
  resetForm() {
    const reviewScreen = document.getElementById('screen-review-write');
    
    // 별점 초기화
    this.currentRating = 0;
    if (reviewScreen) {
      reviewScreen.querySelectorAll('[data-rating]').forEach(star => {
        star.classList.remove('text-amber-400');
        star.classList.add('text-gray-300');
      });
    }

    // 태그 초기화
    this.selectedTags.clear();
    if (reviewScreen) {
      reviewScreen.querySelectorAll('[data-tag]').forEach(tag => {
        tag.classList.remove('bg-primary', 'text-white');
        tag.classList.add('bg-gray-100', 'text-gray-600');
      });
    }

    // 텍스트 영역 초기화
    const textarea = document.getElementById('review-content');
    if (textarea) {
      textarea.value = '';
    }
    
    console.log('⭐ 폼 초기화 완료 - 별점:', this.currentRating);
  }

  /**
   * 폼 유효성 검사
   */
  validateForm() {
    const errors = [];

    if (!selectedRestaurant) {
      errors.push('식당을 먼저 선택해 주세요.');
    }

    if (this.currentRating === 0) {
      errors.push('별점을 선택해 주세요.');
    }

    const content = document.getElementById('review-content')?.value.trim();
    if (!content) {
      errors.push('리뷰 내용을 입력해 주세요.');
    }

    return errors;
  }

  /**
   * 식당 정보를 DB에 저장하고 ID 반환
   */
  async ensureRestaurantInDB(restaurant) {
    try {
      // 카테고리 문자열 추출
      const categoryStr = typeof restaurant.category === 'object' && restaurant.category !== null
        ? (restaurant.category.sub || restaurant.category.main || '음식점')
        : (restaurant.category || '음식점');

      const restaurantData = {
        name: restaurant.name || restaurant.title || '식당명',
        emoji: restaurant.emoji || this.getCategoryEmoji(categoryStr),
        category: categoryStr,
        sub_category: typeof restaurant.category === 'object' ? restaurant.category.detail : '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.telephone || '',
        latitude: restaurant.coordinates?.latitude || null,
        longitude: restaurant.coordinates?.longitude || null
      };

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restaurantData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '식당 정보 저장 실패');
      }

      return result.data.id;
    } catch (error) {
      console.error('식당 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 리뷰 제출 처리
   */
  async handleSubmit() {
    if (this.isSubmitting) return;

    // 유효성 검사
    const errors = this.validateForm();
    if (errors.length > 0) {
      this.showNotification(errors.join('\n'), 'error');
      return;
    }

    this.isSubmitting = true;
    this.setSubmitButtonState(true);

    try {
      const content = document.getElementById('review-content')?.value.trim();

      // 1. 먼저 식당 정보를 DB에 저장
      this.showNotification('식당 정보를 저장하는 중...', 'info');
      const restaurantId = await this.ensureRestaurantInDB(selectedRestaurant);

      // 2. 리뷰 데이터 생성
      const reviewData = {
        restaurant_id: restaurantId,
        session_id: this.sessionId,
        rating: this.currentRating,
        content: content,
        tags: Array.from(this.selectedTags),
        is_public: true
      };

      // 3. 리뷰 저장
      this.showNotification('리뷰를 저장하는 중...', 'info');
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '리뷰 저장에 실패했습니다.');
      }

      // 성공 피드백
      this.showNotification('리뷰가 저장되었습니다! 🎉', 'success');

      // 폼 초기화
      this.resetForm();

      // 잠시 후 리뷰 목록으로 이동
      setTimeout(() => {
        showScreen('reviews');
        // 리뷰 목록 새로고침
        if (reviewHistoryUI) {
          reviewHistoryUI.loadReviews();
        }
      }, 1500);

    } catch (error) {
      console.error('리뷰 저장 오류:', error);
      this.showNotification(error.message || '리뷰 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      this.isSubmitting = false;
      this.setSubmitButtonState(false);
    }
  }

  /**
   * 제출 버튼 상태 설정
   */
  setSubmitButtonState(isLoading) {
    const submitBtn = this.formContainer?.querySelector('[type="submit"]');
    const saveBtn = document.querySelector('[data-action="save"]');

    if (submitBtn) {
      submitBtn.disabled = isLoading;
      if (isLoading) {
        submitBtn.innerHTML = '<span class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>저장 중...';
      } else {
        submitBtn.innerHTML = '리뷰 저장하기';
      }
    }

    if (saveBtn) {
      saveBtn.disabled = isLoading;
      if (isLoading) {
        saveBtn.textContent = '저장 중...';
      } else {
        saveBtn.textContent = '저장';
      }
    }
  }

  /**
   * 알림 메시지 표시
   */
  showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.getElementById('review-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 색상 설정
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-amber-500'
    };

    const notification = document.createElement('div');
    notification.id = 'review-notification';
    notification.className = `fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 ${colors[type]} text-white text-sm font-medium rounded-xl shadow-lg z-[300] transform transition-all duration-300 opacity-0 -translate-y-4`;
    notification.innerHTML = `<span class="whitespace-pre-line">${message}</span>`;

    document.body.appendChild(notification);

    // 애니메이션으로 표시
    requestAnimationFrame(() => {
      notification.classList.remove('opacity-0', '-translate-y-4');
      notification.classList.add('opacity-100', 'translate-y-0');
    });

    // 자동 숨김
    setTimeout(() => {
      notification.classList.add('opacity-0', '-translate-y-4');
      notification.classList.remove('opacity-100', 'translate-y-0');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Global review write UI instance
let reviewWriteUI = null;
