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

const LOOP_COUNT = 5;
const START_SECTION_INDEX = 2;

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

function getSectionWidth(track) {
  return track.scrollWidth / LOOP_COUNT;
}

function normalizeScrollX(track) {
  const sectionWidth = getSectionWidth(track);
  if (sectionWidth <= 0) return;

  const min = sectionWidth;
  const max = sectionWidth * (LOOP_COUNT - 2);

  while (scrollX < min) {
    scrollX += sectionWidth;
    if (manualTargetX !== null) manualTargetX += sectionWidth;
  }

  while (scrollX >= max) {
    scrollX -= sectionWidth;
    if (manualTargetX !== null) manualTargetX -= sectionWidth;
  }
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

function getCardStep(track) {
  const cards = track.querySelectorAll('.glassCard');
  if (!cards || cards.length < 2) return 360 + 16;

  const first = cards[0].getBoundingClientRect();
  const second = cards[1].getBoundingClientRect();

  const step = Math.abs(second.left - first.left);

  if (!Number.isFinite(step) || step <= 0) {
    return first.width + 16;
  }

  return step;
}

function snapRight(track) {
  return scrollX + getCardStep(track);
}

function snapLeft(track) {
  return scrollX - getCardStep(track);
}

function moveToPosition(nextX) {
  if (nextX === null || nextX === undefined) return;

  manualTargetX = nextX;
  targetSpeed = 0;
}

function buildLoopItems() {
  const result = [];

  for (let i = 0; i < LOOP_COUNT; i += 1) {
    result.push(...items);
  }

  return result;
}

function render() {
  const duplicatedItems = buildLoopItems();

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
    if (isIntroDone && manualTargetX === null) {
      targetSpeed = HOVER_SPEED;
    }
  });

  viewport.addEventListener('mouseleave', () => {
    if (isIntroDone && manualTargetX === null) {
      targetSpeed = SCROLL_SPEED;
    }
  });

  next.addEventListener('click', () => {
    moveToPosition(snapRight(track));
  });

  prev.addEventListener('click', () => {
    moveToPosition(snapLeft(track));
  });

  requestAnimationFrame(() => {
    scrollX = getSectionWidth(track) * START_SECTION_INDEX;
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

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  animate();
}

render();
