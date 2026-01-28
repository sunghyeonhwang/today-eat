/**
 * 오늘 뭐먹지 - Client Side JavaScript
 * Material Design 3 Expressive Motion Implementation
 */

// ===================
// Restaurant Data
// ===================
const restaurants = [
  { id: 1, emoji: '🍛', name: '황금카레', category: '일식 · 카레', rating: 4.7, distance: '120m', price: '9,000원' },
  { id: 2, emoji: '🍜', name: '맛있는 국수집', category: '한식 · 국수', rating: 4.5, distance: '350m', price: '8,000원' },
  { id: 3, emoji: '🍕', name: '피자파티', category: '양식 · 피자', rating: 4.8, distance: '500m', price: '15,000원' },
  { id: 4, emoji: '🍔', name: '버거하우스', category: '양식 · 버거', rating: 4.3, distance: '650m', price: '12,000원' },
  { id: 5, emoji: '🍣', name: '스시도쿄', category: '일식 · 초밥', rating: 4.9, distance: '800m', price: '25,000원' },
  { id: 6, emoji: '🍲', name: '엄마손찌개', category: '한식 · 찌개', rating: 4.6, distance: '200m', price: '10,000원' },
  { id: 7, emoji: '🍝', name: '파스타공방', category: '양식 · 파스타', rating: 4.4, distance: '450m', price: '14,000원' },
  { id: 8, emoji: '🌮', name: '타코마니아', category: '멕시칸 · 타코', rating: 4.2, distance: '700m', price: '11,000원' },
  { id: 9, emoji: '🍱', name: '도시락명가', category: '한식 · 도시락', rating: 4.5, distance: '300m', price: '7,000원' },
  { id: 10, emoji: '🥗', name: '샐러드팜', category: '양식 · 샐러드', rating: 4.7, distance: '550m', price: '13,000원' }
];

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
    this.emojis = restaurants.map(r => r.emoji);
    this.spinDuration = 2000; // Total spin time in ms
    this.isAnimating = false;
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

    // Select random restaurant
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    const selected = restaurants[randomIndex];

    // Update reel with selected item
    this.updateReelItems(selected.emoji);

    // Phase 1: Start spinning
    this.slotWindow.classList.add('gacha-machine--spinning');
    this.slotWindow.classList.remove('gacha-machine--stopping', 'gacha-machine--revealed');

    // Add haptic ripple effect
    this.triggerHapticVisual();

    // Wait for spin duration
    await this.delay(this.spinDuration);

    // Phase 2: Decelerate and stop
    this.slotWindow.classList.remove('gacha-machine--spinning');
    this.slotWindow.classList.add('gacha-machine--stopping');

    // Calculate final position to show selected emoji
    const itemHeight = 120;
    const targetPosition = -20 * itemHeight; // Position of selected item
    this.reel.style.transition = 'transform 0.8s cubic-bezier(0.05, 0.7, 0.1, 1)';
    this.reel.style.transform = `translateY(${targetPosition}px)`;

    await this.delay(800);

    // Phase 3: Reveal
    this.slotWindow.classList.remove('gacha-machine--stopping');
    this.slotWindow.classList.add('gacha-machine--revealed');

    // Trigger particle burst
    this.triggerParticleBurst();

    this.isAnimating = false;
    return selected;
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
  const emoji = resultScreen.querySelector('.w-40 .text-6xl, .w-40.h-40 span');
  const imageContainer = resultScreen.querySelector('.w-40.h-40');
  const name = resultScreen.querySelector('#result-title');
  const category = resultScreen.querySelector('#result-title + p');
  const info = resultScreen.querySelector('.flex.items-center.justify-center.gap-6');

  if (imageContainer) {
    imageContainer.innerHTML = `<span class="text-6xl gacha-result-image" aria-hidden="true">${restaurant.emoji}</span>`;
  }
  if (name) {
    name.textContent = restaurant.name;
    name.classList.add('gacha-result-name');
  }
  if (category) {
    category.textContent = restaurant.category;
    category.classList.add('gacha-result-category');
  }
  if (info) {
    info.classList.add('gacha-result-info');
    info.innerHTML = `
      <span class="flex items-center gap-1 text-sm text-gray-600">
        <span aria-hidden="true">⭐</span>
        <span>${restaurant.rating}</span>
      </span>
      <span class="flex items-center gap-1 text-sm text-gray-600">
        <span aria-hidden="true">📍</span>
        <span>${restaurant.distance}</span>
      </span>
      <span class="flex items-center gap-1 text-sm text-gray-600">
        <span aria-hidden="true">💰</span>
        <span>${restaurant.price}</span>
      </span>
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
  // Initialize gacha animator
  gachaAnimator.init();
  confettiSystem.init();

  // Navigation click handlers
  document.querySelectorAll('[data-nav]').forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      const target = navItem.getAttribute('data-nav');
      if (target === 'home') showScreen('home');
      else if (target === 'restaurants') showScreen('restaurants');
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
