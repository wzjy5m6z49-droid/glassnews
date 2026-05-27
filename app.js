const app = document.getElementById('app');
const items = window.newsV2Data || [];

let scrollX = 0;
let isManualScrolling = false;
let animationId = null;

let currentSpeed = 0.75;
let targetSpeed = 0.75;

const SCROLL_SPEED = 0.75;
const HOVER_SPEED = 0;
const EASING = 0.08;

const MANUAL_SCROLL_DURATION = 1050;
const MANUAL_SCROLL_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}.${m}.${day}`;
}

function diffDays(value) {
  if (!value) return 999999;
  return (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
}

function isNew(value) {
  return diffDays(value) <= 3;
}

function getHalfWidth(track) {
  return track.scrollWidth / 2;
}

function normalizeScrollX(track) {
  const halfWidth = getHalfWidth(track);
  if (halfWidth <= 0) return;

  while (scrollX < 0) scrollX += halfWidth;
  while (scrollX >= halfWidth) scrollX -= halfWidth;
}

function getVisibleCards(viewport) {
  const viewportRect = viewport.getBoundingClientRect();

  return Array.from(viewport.querySelectorAll('.glassCard'))
    .map((card) => {
      const rect = card.getBoundingClientRect();
      const visibleLeft = Math.max(rect.left, viewportRect.left);
      const visibleRight = Math.min(rect.right, viewportRect.right);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);

      return { card, rect, visibleWidth };
    })
    .filter((x) => x.visibleWidth > 0);
}

function snapRight(track, viewport) {
  const viewportRect = viewport.getBoundingClientRect();
  const visibleCards = getVisibleCards(viewport);

  const target = visibleCards.find((x) => {
    return x.rect.right > viewportRect.right && x.rect.left < viewportRect.right;
  });

  if (!target) return null;

  return scrollX + (target.rect.left - viewportRect.left);
}

function snapLeft(track, viewport) {
  const viewportRect = viewport.getBoundingClientRect();
  const visibleCards = getVisibleCards(viewport);

  const target = [...visibleCards].reverse().find((x) => {
    return x.rect.left < viewportRect.left && x.rect.right > viewportRect.left;
  });

  if (!target) return null;

  return scrollX - (viewportRect.right - target.rect.right);
}

function moveToPosition(track, nextX) {
  if (!track || isManualScrolling || nextX === null || nextX === undefined) return;

  isManualScrolling = true;

  scrollX = nextX;
  normalizeScrollX(track);

  track.style.transition =
    `transform ${MANUAL_SCROLL_DURATION}ms ${MANUAL_SCROLL_EASING}`;

  track.style.transform = `translateX(${-scrollX}px)`;

  window.setTimeout(() => {
    track.style.transition = '';
    isManualScrolling = false;
  }, MANUAL_SCROLL_DURATION + 30);
}

function render() {
  const duplicatedItems = [...items, ...items];

  app.innerHTML = `
    <div class="glassPage">
      <div class="marqueeWrap">
        <button class="navButton navPrev" type="button" aria-label="前へ">‹</button>
        <button class="navButton navNext" type="button" aria-label="次へ">›</button>

        <div class="marqueeViewport">
          <div class="marqueeTrack" id="marqueeTrack">
            ${duplicatedItems.map((item, index) => {
              const important = item.important === true;
              const date = item.publicationDate || item.created;
              const newItem = isNew(date);

              return `
                <a
                  class="glassCard ${important ? 'importantCard' : ''}"
                  href="${escapeHtml(item.sourceUrl || '#')}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="animation-delay:${index * 0.04}s"
                >
                  <div class="edgeLight"></div>

                  <div class="tagRow">
                    ${important ? '<span class="tag importantTag">重要</span>' : ''}
                    ${newItem ? '<span class="tag newTag">NEW</span>' : ''}
                    <span class="tag deptTag">${escapeHtml(item.department || '未設定')}</span>
                    <span class="tag dateTag">${formatDate(date)}</span>
                  </div>

                  <div class="cardTitle">
                    ${escapeHtml(item.title)}
                  </div>

                  <div class="cardFooter">
                    <span class="readMoreText">Read more</span>
                    <span class="arrow">→</span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const viewport = document.querySelector('.marqueeViewport');
  const track = document.getElementById('marqueeTrack');
  const prev = document.querySelector('.navPrev');
  const next = document.querySelector('.navNext');

  viewport.addEventListener('mouseenter', () => {
    targetSpeed = HOVER_SPEED;
  });

  viewport.addEventListener('mouseleave', () => {
    targetSpeed = SCROLL_SPEED;
  });

  next.addEventListener('click', () => {
    moveToPosition(track, snapRight(track, viewport));
  });

  prev.addEventListener('click', () => {
    moveToPosition(track, snapLeft(track, viewport));
  });

  startMarquee(track);
}

function startMarquee(track) {
  if (!track) return;

  const animate = () => {
    currentSpeed += (targetSpeed - currentSpeed) * EASING;

    if (!isManualScrolling) {
      scrollX += currentSpeed;
      normalizeScrollX(track);
      track.style.transform = `translateX(${-scrollX}px)`;
    }

    animationId = requestAnimationFrame(animate);
  };

  if (animationId) cancelAnimationFrame(animationId);

  animate();
}

render();
