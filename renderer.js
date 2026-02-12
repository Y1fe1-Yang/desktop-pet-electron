/**
 * Desktop Pet Renderer
 * Handles pet logic, wandering behavior, and animation playback
 * Based on Mimo's wandering algorithm (lines 121-172)
 */

// Pet state
const pet = {
  x: 100,
  y: 100,
  velocityX: 0,
  velocityY: 0,
  targetX: 100,
  targetY: 100,
  currentAnimation: 'idle',
  direction: 1, // 1 for right, -1 for left
  isMoving: false
};

// Animation system
const animations = {
  idle: { frames: 4, fps: 8, loop: true },
  walk: { frames: 8, fps: 12, loop: true },
  run: { frames: 8, fps: 16, loop: true },
  jump: { frames: 6, fps: 12, loop: false },
  fall: { frames: 4, fps: 10, loop: true },
  land: { frames: 3, fps: 10, loop: false },
  attack: { frames: 6, fps: 14, loop: false },
  hurt: { frames: 3, fps: 10, loop: false },
  die: { frames: 8, fps: 10, loop: false },
  celebrate: { frames: 6, fps: 10, loop: false }
};

let currentFrame = 0;
let frameTimer = 0;
let lastTimestamp = 0;

// Sprite images cache
const spriteImages = {};
let spritesLoaded = 0;
const totalSprites = Object.keys(animations).length;

// Settings
let settings = {
  animationSpeed: 1.0,
  movementSpeed: 1.0,
  soundEnabled: true
};

// Screen bounds
let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;

// Canvas setup
const canvas = document.getElementById('pet-canvas');
const ctx = canvas.getContext('2d');
const petContainer = document.getElementById('pet-container');

/**
 * Load all sprite sheets
 */
function loadSprites() {
  Object.keys(animations).forEach(animName => {
    const img = new Image();
    img.onload = () => {
      spritesLoaded++;
      if (spritesLoaded === totalSprites) {
        console.log('All sprites loaded successfully');
        init();
      }
    };
    img.onerror = () => {
      console.error(`Failed to load sprite: sprite_${animName}.png`);
      spritesLoaded++;
      if (spritesLoaded === totalSprites) {
        init();
      }
    };
    img.src = `sprites/sprite_${animName}.png`;
    spriteImages[animName] = img;
  });
}

/**
 * Initialize pet system
 */
async function init() {
  try {
    // Load settings from main process
    settings = await window.electronAPI.getSettings();

    // Get screen bounds
    const bounds = await window.electronAPI.getScreenBounds();
    screenWidth = bounds.width;
    screenHeight = bounds.height;

    // Set initial random position
    pet.x = Math.random() * (screenWidth - 128);
    pet.y = Math.random() * (screenHeight - 128);
    updatePetPosition();

    // Listen for settings updates
    window.electronAPI.onSettingsUpdated((newSettings) => {
      settings = newSettings;
      console.log('Settings updated:', settings);
    });

    // Start animation loop
    requestAnimationFrame(gameLoop);

    // Start wandering behavior
    startWandering();

    console.log('Pet initialized successfully');
  } catch (error) {
    console.error('Failed to initialize pet:', error);
  }
}

/**
 * Main game loop
 */
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

/**
 * Update pet state
 * Based on Mimo's wandering algorithm (lines 121-172)
 */
function update(deltaTime) {
  // Update position based on velocity
  if (pet.isMoving) {
    const dx = pet.targetX - pet.x;
    const dy = pet.targetY - pet.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Reached target
      pet.isMoving = false;
      pet.velocityX = 0;
      pet.velocityY = 0;
      setAnimation('idle');
    } else {
      // Move towards target
      const speed = 2 * settings.movementSpeed;
      pet.velocityX = (dx / distance) * speed;
      pet.velocityY = (dy / distance) * speed;

      pet.x += pet.velocityX;
      pet.y += pet.velocityY;

      // Update direction based on movement
      if (pet.velocityX > 0) {
        pet.direction = 1;
      } else if (pet.velocityX < 0) {
        pet.direction = -1;
      }

      // Keep pet within screen bounds
      pet.x = Math.max(0, Math.min(screenWidth - 128, pet.x));
      pet.y = Math.max(0, Math.min(screenHeight - 128, pet.y));

      updatePetPosition();
    }
  }

  // Update animation frame
  const anim = animations[pet.currentAnimation];
  if (anim) {
    const frameDuration = (1000 / anim.fps) / settings.animationSpeed;
    frameTimer += deltaTime;

    if (frameTimer >= frameDuration) {
      frameTimer = 0;
      currentFrame++;

      if (currentFrame >= anim.frames) {
        if (anim.loop) {
          currentFrame = 0;
        } else {
          currentFrame = anim.frames - 1;
          // Animation finished, return to idle
          if (pet.currentAnimation !== 'idle' && !pet.isMoving) {
            setAnimation('idle');
          }
        }
      }
    }
  }
}

/**
 * Render pet sprite
 */
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const anim = animations[pet.currentAnimation];
  const sprite = spriteImages[pet.currentAnimation];

  if (sprite && sprite.complete && anim) {
    const frameWidth = sprite.width / anim.frames;
    const frameHeight = sprite.height;

    ctx.save();

    // Flip sprite based on direction
    if (pet.direction === -1) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Draw current frame
    ctx.drawImage(
      sprite,
      currentFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.restore();
  } else {
    // Fallback: draw a simple circle if sprite not loaded
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Update pet DOM position
 */
function updatePetPosition() {
  petContainer.style.left = `${pet.x}px`;
  petContainer.style.top = `${pet.y}px`;
}

/**
 * Set current animation
 */
function setAnimation(animName) {
  if (animations[animName] && pet.currentAnimation !== animName) {
    pet.currentAnimation = animName;
    currentFrame = 0;
    frameTimer = 0;
  }
}

/**
 * Wandering behavior - picks random targets periodically
 * Based on Mimo's wandering algorithm (lines 121-172)
 */
function startWandering() {
  function pickNewTarget() {
    // Random position on screen
    pet.targetX = Math.random() * (screenWidth - 128);
    pet.targetY = Math.random() * (screenHeight - 128);
    pet.isMoving = true;

    // Choose animation based on distance
    const distance = Math.sqrt(
      Math.pow(pet.targetX - pet.x, 2) +
      Math.pow(pet.targetY - pet.y, 2)
    );

    if (distance > 200) {
      setAnimation('run');
    } else {
      setAnimation('walk');
    }
  }

  // Pick new target every 3-7 seconds
  function scheduleNextMove() {
    const delay = (3000 + Math.random() * 4000) / settings.movementSpeed;
    setTimeout(() => {
      pickNewTarget();
      scheduleNextMove();
    }, delay);
  }

  // Start wandering
  pickNewTarget();
  scheduleNextMove();
}

/**
 * Handle pet click - enable mouse events temporarily
 * Based on Mimo's click-through handler (lines 184-233)
 */
petContainer.addEventListener('mouseenter', () => {
  window.electronAPI.setIgnoreMouse(false);
});

petContainer.addEventListener('mouseleave', () => {
  window.electronAPI.setIgnoreMouse(true);
});

petContainer.addEventListener('click', () => {
  // Random interaction
  const interactions = ['jump', 'celebrate', 'attack'];
  const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];

  setAnimation(randomInteraction);

  // Return to idle after animation
  setTimeout(() => {
    if (!pet.isMoving) {
      setAnimation('idle');
    }
  }, (animations[randomInteraction].frames / animations[randomInteraction].fps) * 1000);
});

/**
 * Handle window resize
 */
window.addEventListener('resize', async () => {
  const bounds = await window.electronAPI.getScreenBounds();
  screenWidth = bounds.width;
  screenHeight = bounds.height;
});

// Start loading sprites
loadSprites();
