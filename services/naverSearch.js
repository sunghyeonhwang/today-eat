/**
 * 네이버 지역검색 API 서비스 모듈
 * Naver Local Search API Integration
 *
 * API 문서: https://developers.naver.com/docs/serviceapi/search/local/local.md
 */

const NAVER_API_BASE_URL = 'https://openapi.naver.com/v1/search/local.json';

/**
 * 네이버 지역검색 API를 통해 음식점 검색
 * @param {Object} options - 검색 옵션
 * @param {string} options.query - 검색 키워드 (필수)
 * @param {number} [options.display=10] - 결과 개수 (1-5, 트래픽 제한으로 최대 5)
 * @param {number} [options.start=1] - 시작 위치 (1-1000)
 * @param {string} [options.sort='random'] - 정렬 방식 ('random': 랜덤, 'comment': 리뷰 많은 순)
 * @returns {Promise<Object>} 검색 결과
 */
async function searchLocal(options) {
  const {
    query,
    display = 5,
    start = 1,
    sort = 'random'
  } = options;

  if (!query) {
    throw new Error('검색 키워드(query)는 필수입니다.');
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('네이버 API 인증 정보가 설정되지 않았습니다. NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 확인하세요.');
  }

  const params = new URLSearchParams({
    query,
    display: Math.min(display, 5).toString(), // 최대 5개 제한
    start: start.toString(),
    sort
  });

  const url = `${NAVER_API_BASE_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`네이버 API 호출 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * 위치 기반 주변 음식점 검색
 * @param {Object} options - 검색 옵션
 * @param {string} options.location - 위치 (주소 또는 지역명)
 * @param {string} [options.category] - 음식 카테고리 (한식, 일식, 중식, 양식 등)
 * @param {number} [options.count=10] - 결과 개수 (최대 10, API 제한으로 2회 호출)
 * @returns {Promise<Object>} 포맷된 음식점 목록
 */
async function searchNearbyRestaurants(options) {
  const {
    location,
    category = '',
    count = 10
  } = options;

  if (!location) {
    throw new Error('위치 정보(location)는 필수입니다.');
  }

  // 검색 쿼리 구성: "위치 + 카테고리 + 맛집/음식점"
  const searchTerm = category
    ? `${location} ${category} 맛집`
    : `${location} 맛집`;

  const results = [];
  const callsNeeded = Math.ceil(Math.min(count, 10) / 5);

  // API는 한 번에 최대 5개만 반환하므로 필요시 여러 번 호출
  for (let i = 0; i < callsNeeded; i++) {
    try {
      const response = await searchLocal({
        query: searchTerm,
        display: 5,
        start: i * 5 + 1,
        sort: 'comment' // 리뷰 많은 순으로 정렬
      });

      if (response.items && response.items.length > 0) {
        results.push(...response.items);
      }
    } catch (error) {
      // 첫 번째 호출 실패 시 에러 전파
      if (i === 0) throw error;
      // 이후 호출 실패는 무시하고 계속 진행
      console.warn(`추가 검색 호출 ${i + 1} 실패:`, error.message);
      break;
    }
  }

  // 중복 제거 및 개수 제한
  const uniqueResults = removeDuplicates(results);
  const limitedResults = uniqueResults.slice(0, count);

  return {
    total: limitedResults.length,
    location,
    category: category || '전체',
    restaurants: limitedResults.map(formatRestaurant)
  };
}

/**
 * 네이버 API 응답을 앱 형식으로 변환
 * @param {Object} item - 네이버 API 응답 항목
 * @returns {Object} 포맷된 음식점 정보
 */
function formatRestaurant(item) {
  return {
    name: removeHtmlTags(item.title),
    address: item.address || '',
    roadAddress: item.roadAddress || '',
    category: parseCategory(item.category),
    telephone: item.telephone || '',
    description: removeHtmlTags(item.description) || '',
    link: item.link || '',
    mapx: item.mapx || '',
    mapy: item.mapy || '',
    // 좌표 변환 (네이버 카텍 좌표 -> WGS84)
    coordinates: convertNaverCoordinates(item.mapx, item.mapy)
  };
}

/**
 * HTML 태그 제거
 * @param {string} str - HTML이 포함된 문자열
 * @returns {string} 태그가 제거된 문자열
 */
function removeHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * 카테고리 문자열 파싱
 * 네이버 카테고리 형식: "음식점>한식>삼겹살"
 * @param {string} categoryStr - 네이버 카테고리 문자열
 * @returns {Object} 파싱된 카테고리 정보
 */
function parseCategory(categoryStr) {
  if (!categoryStr) {
    return { main: '음식점', sub: '', detail: '' };
  }

  const parts = categoryStr.split('>').map(p => p.trim());
  return {
    main: parts[0] || '음식점',
    sub: parts[1] || '',
    detail: parts[2] || '',
    raw: categoryStr
  };
}

/**
 * 네이버 좌표(KATEC)를 WGS84(GPS) 좌표로 변환
 * 네이버 지역검색 API의 mapx, mapy는 KATECH 좌표계 값에 10을 곱한 정수
 * @param {string} mapx - X 좌표 (경도 방향, KATECH * 10)
 * @param {string} mapy - Y 좌표 (위도 방향, KATECH * 10)
 * @returns {Object|null} 변환된 좌표 { latitude, longitude }
 */
function convertNaverCoordinates(mapx, mapy) {
  if (!mapx || !mapy) return null;

  const x = parseInt(mapx, 10);
  const y = parseInt(mapy, 10);

  if (isNaN(x) || isNaN(y)) return null;

  // 네이버 좌표는 KATECH 좌표에 10을 곱한 값
  // KATECH -> WGS84 근사 변환 (대한민국 지역용)
  // 참고: 정확한 변환을 위해서는 proj4 라이브러리 사용 권장

  // KATECH 좌표로 변환 (10으로 나누기)
  const katechX = x / 10;
  const katechY = y / 10;

  // KATECH (Korea TM/BESSEL) to WGS84 근사 변환
  // 대한민국 중심 지역 기준 근사값
  const longitude = (katechX - 500000) / 110000 + 127.5;
  const latitude = (katechY - 200000) / 110000 + 37.5;

  // 한반도 범위 검증 (위도: 33~43, 경도: 124~132)
  if (latitude < 33 || latitude > 43 || longitude < 124 || longitude > 132) {
    // 좌표가 한반도 범위를 벗어나면 원본 값 반환
    return {
      latitude: null,
      longitude: null,
      raw: { mapx: x, mapy: y }
    };
  }

  return {
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6))
  };
}

/**
 * 중복 음식점 제거 (이름과 주소 기준)
 * @param {Array} restaurants - 음식점 목록
 * @returns {Array} 중복이 제거된 목록
 */
function removeDuplicates(restaurants) {
  const seen = new Set();
  return restaurants.filter(item => {
    const key = `${removeHtmlTags(item.title)}|${item.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  searchLocal,
  searchNearbyRestaurants,
  formatRestaurant,
  removeHtmlTags,
  parseCategory,
  convertNaverCoordinates
};
