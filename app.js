const app = document.getElementById('app');
const items = window.newsV2Data || [];

let scrollX = 0;
let animationId = null;
let isIntroDone = false;

let currentSpeed = 0;
let targetSpeed = 0;

let manualTargetX = null;

const SCROLL_SPEED = 0.75;
const HOVER_SPEED = 0;
const SPEED_EASING = 0.08;

const INTRO_WAIT = 1400;

const MANUAL_EASING = 0.08;
const MANUAL_STOP_DISTANCE = 0.5;

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
  return track.scrollWidth / 3;
}

function normalizeScrollX(track) {
  const halfWidth = getHalfWidth(track);
  if (halfWidth <= 0) return;

  while (scrollX < 0) scrollX += halfWidth;
  while (scrollX >= halfWidth) scrollX -= halfWidth;
}

function applyTransform(track) {
  track.style.transform = `translateX(${-scrollX}px)`;
}

function instantMove(track) {
  track.style.transition = 'none';
  applyTransform(track);
  track.offsetHeight;
  track.style.transition = '';
}

function getCardInfo(viewport) {
  const viewportRect = viewport.getBoundingClientRect();

  return Array.from(viewport.querySelectorAll('.glassCard')).map((card) => {
    const rect = card.getBoundingClientRect();

    const visibleLeft = Math.max(rect.left, viewportRect.left);
    const visibleRight = Math.min(rect.right, viewportRect.right);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);

    return {
      card,
      rect,
      visibleWidth,
      viewportRect
    };
  });
}

function snapRight(track, viewport) {
  const halfWidth = getHalfWidth(track);
  const viewportRect = viewport.getBoundingClientRect();

  let cards = getCardInfo(viewport);

  let target = cards.find((x) => {
    return x.rect.right > viewportRect.right && x.rect.left < viewportRect.right;
  });

  if (!target) {
    target = cards.find((x) => {
      return x.rect.left >= viewportRect.right;
    });
  }

  if (!target) {
    return scrollX - halfWidth;
  }

  return scrollX + (target.rect.left - viewportRect.left);
}

function snapLeft(track, viewport) {
  const halfWidth = getHalfWidth(track);
  const viewportRect = viewport.getBoundingClientRect();

  let cards = getCardInfo(viewport);

  let target = [...cards].reverse().find((x) => {
    return x.rect.left < viewportRect.left && x.rect.right > viewportRect.left;
  });

  if (!target) {
    target = [...cards].reverse().find((x) => {
      return x.rect.right <= viewportRect.left;
    });
  }

  if (!target) {
    return scrollX + halfWidth;
  }

  return scrollX - (viewportRect.right - target.rect.right);
}

function moveToPosition(nextX) {
  if (nextX === null || nextX === undefined) return;

  manualTargetX = nextX;
  targetSpeed = 0;
}

function render() {
  const duplicatedItems = [
  ...items,
  ...items,
  ...items
];

  app.innerHTML = `
    <div class="glassPage">
      <div class="marqueeWrap">
        <button class="navButton navPrev" type="button" aria-label="前へ">‹</button>
        <button class="navButton navNext" type="button" aria-label="次へ">›</button>

        <div class="marqueeViewport">
          <div class="marqueeTrack introTrack" id="marqueeTrack">
            ${duplicatedItems.map((item, index) => {
              const important = item.important === true;
              const date = item.publicationDate || item.created;
              const newItem = isNew(date);

              return `
                <a
                  class="glassCard ${important ? 'importantCard' : ''}"
                  href="${escapeHtml(item.sourceUrl || '#')}"
                  target="_top"
                  style="animation-delay:${index * 0.05}s"
                >
                  <div class="tagRow">
                    <span class="tag deptTag">${escapeHtml(item.department || '未設定')}</span>
                    ${important ? '<span class="tag importantTag">重要</span>' : ''}
                    ${newItem ? '<span class="tag newTag">NEW</span>' : ''}
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
    if (isIntroDone && manualTargetX === null) targetSpeed = HOVER_SPEED;
  });

  viewport.addEventListener('mouseleave', () => {
    if (isIntroDone && manualTargetX === null) targetSpeed = SCROLL_SPEED;
  });

  next.addEventListener('click', () => {
    moveToPosition(snapRight(track, viewport));
  });

  prev.addEventListener('click', () => {
    moveToPosition(snapLeft(track, viewport));
  });

requestAnimationFrame(() => {
  scrollX = getHalfWidth(track);
  applyTransform(track);
});

  startMarquee(track);

  window.setTimeout(() => {
    isIntroDone = true;
    targetSpeed = SCROLL_SPEED;
    track.classList.remove('introTrack');
    track.classList.add('scrollStarted');
  }, INTRO_WAIT);
}

function startMarquee(track) {
  if (!track) return;

  const animate = () => {
    currentSpeed += (targetSpeed - currentSpeed) * SPEED_EASING;

    if (manualTargetX !== null) {
      const distance = manualTargetX - scrollX;

      scrollX += distance * MANUAL_EASING;

      if (Math.abs(distance) <= MANUAL_STOP_DISTANCE) {
        scrollX = manualTargetX;
        manualTargetX = null;

        normalizeScrollX(track);
        instantMove(track);

        if (isIntroDone) {
          targetSpeed = SCROLL_SPEED;
        }
      }
    } else {
      scrollX += currentSpeed;
      normalizeScrollX(track);
    }

    applyTransform(track);

    animationId = requestAnimationFrame(animate);
  };

  if (animationId) cancelAnimationFrame(animationId);

  animate();
}

render();
