// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * QA Test Suite for "What-eat-today" (오늘 뭐먹지)
 * 전체 기능 QA 테스트 - 모든 사용자 시나리오 검증
 */

const SCREENSHOT_DIR = '.agent-screenshots';

// Helper to get bottom navigation link (more specific selector)
const getBottomNavLink = (page, navName) => {
  return page.locator(`nav[aria-label="메인 네비게이션"] a[data-nav="${navName}"]`);
};

test.describe('Home Screen Tests', () => {
  test('should display home screen with all main elements', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/오늘 뭐먹지/);

    // Check hero section
    await expect(page.locator('h1#home-title')).toContainText('오늘 뭐 먹지?');

    // Check main action buttons
    const nearbyButton = page.locator('button[data-action="nearby"]');
    await expect(nearbyButton).toBeVisible();
    await expect(nearbyButton).toContainText('주변 맛집 찾기');

    const randomButton = page.locator('button[data-action="random"]');
    await expect(randomButton).toBeVisible();
    await expect(randomButton).toContainText('랜덤으로 정하기');

    // Check bottom navigation
    await expect(page.locator('nav[aria-label="메인 네비게이션"]')).toBeVisible();
    await expect(getBottomNavLink(page, 'home')).toBeVisible();
    await expect(getBottomNavLink(page, 'restaurants')).toBeVisible();
    await expect(getBottomNavLink(page, 'gacha')).toBeVisible();
    await expect(getBottomNavLink(page, 'reviews')).toBeVisible();

    // Screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-01-home-screen.png`, fullPage: true });
  });

  test('should navigate to restaurants screen when clicking nearby button', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[data-action="nearby"]').click();
    await page.waitForTimeout(500); // Wait for animation

    // Check restaurants screen is visible
    const restaurantsScreen = page.locator('#screen-restaurants');
    await expect(restaurantsScreen).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-02-restaurants-screen.png`, fullPage: true });
  });

  test('should navigate to gacha screen when clicking random button', async ({ page }) => {
    await page.goto('/');

    await page.locator('button[data-action="random"]').click();
    await page.waitForTimeout(500);

    const gachaScreen = page.locator('#screen-gacha');
    await expect(gachaScreen).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-03-gacha-screen.png`, fullPage: true });
  });
});

test.describe('Bottom Navigation Tests', () => {
  test('should navigate to all screens using bottom navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate to restaurants (탐색)
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#screen-restaurants')).toBeVisible();

    // Navigate to gacha (랜덤)
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#screen-gacha')).toBeVisible();

    // Navigate to reviews (리뷰)
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#screen-reviews')).toBeVisible();

    // Navigate back to home
    await getBottomNavLink(page, 'home').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#screen-home')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-04-navigation-complete.png`, fullPage: true });
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/');

    // Check home is active by default
    const homeNav = getBottomNavLink(page, 'home');
    await expect(homeNav).toHaveClass(/text-primary/);

    // Navigate to gacha and check it becomes active
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(300);
    const gachaNav = getBottomNavLink(page, 'gacha');
    await expect(gachaNav).toHaveClass(/text-primary/);
  });
});

test.describe('Restaurant Search Tests', () => {
  test('should display restaurant search screen with location prompt', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(500);

    // Check initial state
    const restaurantList = page.locator('#restaurant-list-container');
    await expect(restaurantList).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-05-restaurant-search.png`, fullPage: true });
  });

  test('should have filter button visible', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(300);

    const filterButton = page.locator('button[data-action="filter"]');
    await expect(filterButton).toBeVisible();
    await expect(filterButton).toContainText('필터');
  });

  test('should open filter modal when clicking filter button', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(300);

    await page.locator('button[data-action="filter"]').click();
    await page.waitForTimeout(300);

    const filterModal = page.locator('#filter-modal');
    // Check if modal is visible (opacity transition)
    await expect(filterModal).not.toHaveClass(/invisible/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-06-filter-modal.png`, fullPage: true });
  });

  test('should have back button that returns to home', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(300);

    await page.locator('#screen-restaurants button[data-action="back"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#screen-home')).toBeVisible();
  });
});

test.describe('Gacha (Random Selection) Tests', () => {
  test('should display gacha screen with slot machine UI', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(500);

    // Check gacha screen elements
    await expect(page.locator('#gacha-title')).toContainText('오늘의 메뉴는?');

    // Check gacha button
    const gachaButton = page.locator('button[data-action="gacha"]');
    await expect(gachaButton).toBeVisible();
    await expect(gachaButton).toContainText('뽑기!');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-07-gacha-initial.png`, fullPage: true });
  });

  test('should trigger gacha animation when clicking button', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(500);

    // Click gacha button
    await page.locator('button[data-action="gacha"]').click();

    // Wait for animation to complete (gacha animation takes a few seconds)
    await page.waitForTimeout(3500);

    // Check if result screen is shown
    const resultScreen = page.locator('#screen-gacha-result');
    await expect(resultScreen).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-08-gacha-result.png`, fullPage: true });
  });

  test('should have retry button on result screen', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(500);

    await page.locator('button[data-action="gacha"]').click();
    await page.waitForTimeout(3500);

    const retryButton = page.locator('button[data-action="retry"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('다시 뽑기');
  });

  test('should have select button on result screen', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(500);

    await page.locator('button[data-action="gacha"]').click();
    await page.waitForTimeout(3500);

    const selectButton = page.locator('button[data-action="select"]');
    await expect(selectButton).toBeVisible();
    await expect(selectButton).toContainText('여기로 갈래요!');
  });

  test('should return to gacha screen when clicking retry', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'gacha').click();
    await page.waitForTimeout(500);

    await page.locator('button[data-action="gacha"]').click();
    await page.waitForTimeout(3500);

    await page.locator('button[data-action="retry"]').click();
    await page.waitForTimeout(500);

    // Should return to gacha screen
    await expect(page.locator('#screen-gacha')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-09-gacha-retry.png`, fullPage: true });
  });
});

test.describe('Review List Tests', () => {
  test('should display review list screen', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);

    // Check review screen elements
    await expect(page.locator('#reviews-title')).toContainText('내 리뷰');

    // Check write button
    const writeButton = page.locator('#screen-reviews button[data-action="write"]');
    await expect(writeButton).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-10-review-list.png`, fullPage: true });
  });

  test('should have sort controls', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);

    // Check sort buttons
    const dateSortButton = page.locator('button[data-sort-reviews="date"]');
    const ratingSortButton = page.locator('button[data-sort-reviews="rating"]');

    await expect(dateSortButton).toBeVisible();
    await expect(ratingSortButton).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-11-review-sort-controls.png`, fullPage: true });
  });

  test('should toggle sort buttons', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);

    // Click rating sort
    await page.locator('button[data-sort-reviews="rating"]').click();
    await page.waitForTimeout(300);

    // Check if rating button is now active
    const ratingSortButton = page.locator('button[data-sort-reviews="rating"]');
    await expect(ratingSortButton).toHaveClass(/bg-primary/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-12-review-sort-rating.png`, fullPage: true });
  });
});

test.describe('Review Write Tests', () => {
  test('should navigate to review write screen', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);

    // Click write button
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);

    // Check review write screen
    const reviewWriteScreen = page.locator('#screen-review-write');
    await expect(reviewWriteScreen).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-13-review-write-screen.png`, fullPage: true });
  });

  test('should display review form elements', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);

    // Check form elements
    await expect(page.locator('#review-content')).toBeVisible();

    // Check rating buttons
    const ratingButtons = page.locator('#screen-review-write button[data-rating]');
    await expect(ratingButtons).toHaveCount(5);

    // Check tag buttons
    const tagButtons = page.locator('#screen-review-write button[data-tag]');
    expect(await tagButtons.count()).toBeGreaterThan(0);

    // Check submit button
    const submitButton = page.locator('#screen-review-write form button[type="submit"]');
    await expect(submitButton).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-14-review-form-elements.png`, fullPage: true });
  });

  test('should allow rating selection', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);

    // Click 5-star rating
    await page.locator('#screen-review-write button[data-rating="5"]').click();
    await page.waitForTimeout(200);

    // Check if 5th star is now active (amber color)
    const fifthStar = page.locator('#screen-review-write button[data-rating="5"]');
    await expect(fifthStar).toHaveClass(/text-amber/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-15-review-rating-selected.png`, fullPage: true });
  });

  test('should allow tag selection', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);

    // Click a tag button
    const valueTag = page.locator('#screen-review-write button[data-tag="value"]');
    await valueTag.click();
    await page.waitForTimeout(200);

    // Check if tag is selected
    await expect(valueTag).toHaveClass(/bg-primary/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-16-review-tag-selected.png`, fullPage: true });
  });

  test('should allow text input in review content', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);

    // Type in review content
    const reviewContent = page.locator('#review-content');
    await reviewContent.fill('정말 맛있는 음식이었습니다! 다음에 또 방문할게요.');

    await expect(reviewContent).toHaveValue('정말 맛있는 음식이었습니다! 다음에 또 방문할게요.');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-17-review-content-filled.png`, fullPage: true });
  });

  test('should have back button that returns to review list', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);

    // Click back button
    await page.locator('#screen-review-write button[data-action="back"]').click();
    await page.waitForTimeout(300);

    // Should return to review list
    await expect(page.locator('#screen-reviews')).toBeVisible();
  });
});

test.describe('Filter Modal Tests', () => {
  test('should display all filter options', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-action="filter"]').click();
    await page.waitForTimeout(300);

    // Check food type filters
    await expect(page.getByText('음식 종류')).toBeVisible();
    await expect(page.getByRole('button', { name: '전체' })).toBeVisible();
    await expect(page.getByRole('button', { name: '한식' })).toBeVisible();
    await expect(page.getByRole('button', { name: '일식' })).toBeVisible();

    // Check distance filters
    await expect(page.getByText('거리')).toBeVisible();

    // Check price filters
    await expect(page.getByText('가격대')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-18-filter-options.png`, fullPage: true });
  });

  test('should close filter modal with close button', async ({ page }) => {
    await page.goto('/');
    await getBottomNavLink(page, 'restaurants').click();
    await page.waitForTimeout(300);
    await page.locator('button[data-action="filter"]').click();
    await page.waitForTimeout(300);

    // Click close button
    await page.locator('button[data-action="close-modal"]').click();
    await page.waitForTimeout(300);

    // Modal should be hidden
    const filterModal = page.locator('#filter-modal');
    await expect(filterModal).toHaveClass(/invisible/);
  });
});

test.describe('Accessibility Tests', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check navigation aria label
    await expect(page.locator('nav[aria-label="메인 네비게이션"]')).toBeVisible();

    // Check button aria labels
    await expect(page.locator('button[aria-label="알림"]')).toBeVisible();
    await expect(page.locator('button[aria-label="설정"]')).toBeVisible();
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check h1 exists
    const h1 = page.locator('h1');
    expect(await h1.count()).toBeGreaterThan(0);

    // Check h2 exists for sections
    const h2 = page.locator('h2');
    expect(await h2.count()).toBeGreaterThan(0);
  });
});

test.describe('Responsive Design Tests', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');

    // Check layout fits mobile
    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-19-mobile-viewport.png`, fullPage: true });
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-20-tablet-viewport.png`, fullPage: true });
  });
});

test.describe('Visual Consistency Tests', () => {
  test('should maintain consistent styling across screens', async ({ page }) => {
    await page.goto('/');

    // Check primary color usage
    const primaryButtons = page.locator('.bg-primary, .text-primary, .from-primary');
    expect(await primaryButtons.count()).toBeGreaterThan(0);

    // Check card styling
    const cards = page.locator('.rounded-2xl');
    expect(await cards.count()).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-21-visual-consistency.png`, fullPage: true });
  });
});

test.describe('Complete User Flow Test', () => {
  test('should complete full user journey', async ({ page }) => {
    await page.goto('/');

    // Step 1: Home screen
    await expect(page.locator('#screen-home')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-01-home.png` });

    // Step 2: Go to gacha
    await page.locator('button[data-action="random"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#screen-gacha')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-02-gacha.png` });

    // Step 3: Trigger gacha
    await page.locator('button[data-action="gacha"]').click();
    await page.waitForTimeout(3500);
    await expect(page.locator('#screen-gacha-result')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-03-result.png` });

    // Step 4: Go to reviews
    await getBottomNavLink(page, 'reviews').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#screen-reviews')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-04-reviews.png` });

    // Step 5: Go to write review
    await page.locator('#screen-reviews button[data-action="write"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#screen-review-write')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-05-write-review.png` });

    // Step 6: Fill review form
    await page.locator('#screen-review-write button[data-rating="5"]').click();
    await page.locator('#review-content').fill('테스트 리뷰 내용입니다.');
    await page.locator('#screen-review-write button[data-tag="tasty"]').click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-06-filled-review.png` });

    // Step 7: Return to home
    await getBottomNavLink(page, 'home').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#screen-home')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/qa-flow-07-back-home.png` });
  });
});
