// ========================================================================= //
//                                                                           //
//                CONTENIDO COMPLETO DE game.js (Versión Corregida v4)       //
//                                                                           //
// ========================================================================= //

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('startButton');
const instructionsDiv = document.getElementById('instructions'); // Added instruction div reference
const touchControlsDiv = document.getElementById('touch-controls'); // Added touch controls div reference

// --- Referencias a Botones Táctiles ---
const dpadUp = document.getElementById('dpad-up');
// Removed dpadDown reference
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const shootButton = document.getElementById('shoot-button');

// --- Recursos ---
const playerImg = new Image();
playerImg.src = 'pla.png'; // Asegúrate que esta imagen existe
const bgImg = new Image();
bgImg.src = 'fondo.png'; // Asegúrate que esta imagen existe
const enemyImages = { lex: new Image(), mau: new Image() };
enemyImages.lex.src = 'lex.png'; // Asegúrate que esta imagen existe
enemyImages.mau.src = 'mau.png'; // Asegúrate que esta imagen existe
const powerUpImages = { fast_shot: new Image(), clear_screen: new Image() };
powerUpImages.fast_shot.src = 'man.png'; // Vida extra (asegúrate que existe)
powerUpImages.clear_screen.src = 'luc.png'; // Limpia pantalla (asegúrate que existe)

// Sonidos
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego ---
const PLAYER_SIZE = 60; // Adjusted size for mobile
const ENEMY_SIZE = 45;  // Adjusted size for mobile
const POWERUP_SIZE = 30; // Adjusted size for mobile
const LASER_SPEED = 6;
const PLAYER_TURN_SPEED = 0.09;
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.4;
const ENEMY_SPEED_MAX = 1.2;
const POINTS_PER_LEVEL = 10;
const POWERUP_CHANCE = 0.0015;
const POWERUP_DURATION = 8000; // Powerups last 8 sec on screen
const RARE_POWERUP_CHANCE_MOD = 0.2;
const ENEMY_SPAWN_RATE_INITIAL = 140;
const ENEMY_SPAWN_RATE_INCREASE = 0.96;
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 3500; // 3.5 seconds of invincibility

let score = 0;
let level = 1;
let lives = INITIAL_LIVES;
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

let player = {
    x: canvas.width / 2, y: canvas.height / 2,
    width: PLAYER_SIZE, height: PLAYER_SIZE,
    angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
    shootCooldown: 0, baseFireRate: 18, currentFireRate: 18,
    fireRateBoostTimer: 0, invincible: false, invincibilityTimer: 0
};

let lasers = [];
let enemies = [];
let powerUps = [];
let keys = {}; // Object to track pressed keys/buttons

// --- Carga de Imágenes ---
let imagesLoadedCount = 0;
const totalImagesToLoad = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length;
function imageLoaded() {
    imagesLoadedCount++;
    console.log(`Imagen cargada (${imagesLoadedCount}/${totalImagesToLoad})`);
    if (imagesLoadedCount === totalImagesToLoad) {
        console.log("Todas las imágenes cargadas.");
    }
}
[playerImg, bgImg, enemyImages.lex, enemyImages.mau, powerUpImages.fast_shot, powerUpImages.clear_screen].forEach(img => {
    img.onload = imageLoaded;
    img.onerror = () => console.error(`Error cargando ${img.src}`);
});

// --- Controles (Teclado y Táctil) ---
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevent default for game-related keys
    if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) { // Removed ArrowDown
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
     // Only set key to false if it was true (important for touch)
    if (keys[e.code] === true) {
        keys[e.code] = false;
    }
});

// Functions to handle touch events
function handleTouchStart(e, keyCode) {
    e.preventDefault();
    keys[keyCode] = true;
}
function handleTouchEnd(e, keyCode) {
    e.preventDefault();
    // Use a small timeout to prevent issues with quick taps,
    // but setting to false directly might be okay for simple controls.
    // For a more robust solution with multi-touch, you'd track individual touches.
     keys[keyCode] = false;
}

// Assign listeners to touch buttons
[{el: dpadUp, key: 'ArrowUp'}, {el: dpadLeft, key: 'ArrowLeft'}, {el: dpadRight, key: 'ArrowRight'}, {el: shootButton, key: 'Space'}].forEach(item => { // Removed dpadDown
    item.el.addEventListener('touchstart', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('touchend', (e) => handleTouchEnd(e, item.key), { passive: false });
     // Also add mouse event listeners for desktop debugging/compatibility
    item.el.addEventListener('mousedown', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('mouseup', (e) => handleTouchEnd(e, item.key), { passive: false });
    // Handle touch cancellation
     item.el.addEventListener('touchcancel', (e) => handleTouchEnd(e, item.key), { passive: false });
});
// touchControlsDiv.style.display is now handled by CSS media query


// --- Funciones del Juego ---

function playSound(sound) {
    const clone = sound.cloneNode();
    clone.volume = sound.volume; // Use base volume of original element
    clone.play().catch(e => console.warn("Advertencia sonido:", e.message));
}

function wrapAround(obj) {
    const w = canvas.width, h = canvas.height;
    const hw = obj.width / 2, hh = obj.height / 2;
    if (obj.x < -hw) obj.x = w + hw;
    if (obj.x > w + hw) obj.x = -hw;
    if (obj.y < -hh) obj.y = h + hh;
    if (obj.y > h + hh) obj.y = -hh;
}

function updatePlayer() {
    // Rotation
    player.rotation = keys['ArrowLeft'] ? -PLAYER_TURN_SPEED : (keys['ArrowRight'] ? PLAYER_TURN_SPEED : 0);
    player.angle += player.rotation;

    // Thrust
    player.thrusting = keys['ArrowUp'];
    if (player.thrusting) {
        player.vx += Math.cos(player.angle) * PLAYER_THRUST;
        player.vy += Math.sin(player.angle) * PLAYER_THRUST;
    }

    // Friction and Movement
    player.vx *= FRICTION;
    player.vy *= FRICTION;
    player.x += player.vx;
    player.y += player.vy;
    wrapAround(player);

    // Shooting
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (keys['Space'] && player.shootCooldown <= 0) {
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }

    // Invincibility Timer
    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60; // ~16.67ms per frame
        if (player.invincibilityTimer <= 0) player.invincible = false;
    }
}

function shootLaser() {
    const angle = player.angle;
    const originDist = player.width / 2;
    const startX = player.x + Math.cos(angle) * originDist;
    const startY = player.y + Math.sin(angle) * originDist;
    lasers.push({
        x: startX, y: startY, angle: angle,
        vx: Math.cos(angle) * LASER_SPEED + player.vx * 0.4,
        vy: Math.sin(angle) * LASER_SPEED + player.vy * 0.4,
        width: 3, height: 8
    });
    playSound(shotSound);
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.x += l.vx;
        l.y += l.vy;
        if (l.x < 0 || l.x > canvas.width || l.y < 0 || l.y > canvas.height) {
            lasers.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    const edge = Math.floor(Math.random() * 4);
    const w = canvas.width, h = canvas.height;
    const margin = ENEMY_SIZE * 1.5; // Appear further from the edge
    let x, y;

    if (edge === 0) { x = Math.random() * w; y = -margin; } // Top
    else if (edge === 1) { x = w + margin; y = Math.random() * h; } // Right
    else if (edge === 2) { x = Math.random() * w; y = h + margin; } // Bottom
    else { x = -margin; y = Math.random() * h; } // Left

    const angleToCenter = Math.atan2(h / 2 - y, w / 2 - x);
    const angleVariation = (Math.random() - 0.5) * (Math.PI / 2);
    const angle = angleToCenter + angleVariation;
    const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.08);

    enemies.push({
        x: x, y: y, width: ENEMY_SIZE, height: ENEMY_SIZE,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        type: type, image: enemyImages[type]
    });
}

function updateEnemies() {
    enemySpawnCounter++;
    const maxEnemies = 12 + level * 2; // Limit the number of enemies on screen
    if (enemySpawnCounter >= enemySpawnRate && enemies.length < maxEnemies) {
        spawnEnemy();
        enemySpawnCounter = 0;
    }
    // Move and wrap existing enemies
    enemies.forEach(e => { e.x += e.vx; e.y += e.vy; wrapAround(e); });
}

function spawnPowerUp() {
    const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot'; // fast_shot gives life
    powerUps.push({
        x: Math.random() * (canvas.width - POWERUP_SIZE),
        y: Math.random() * (canvas.height - POWERUP_SIZE),
        width: POWERUP_SIZE, height: POWERUP_SIZE, type: type,
        image: powerUpImages[type], creationTime: Date.now()
    });
}

function updatePowerUps() {
    // Spawn new powerups randomly
    if (Math.random() < POWERUP_CHANCE && powerUps.length < 2) spawnPowerUp();
    // Remove powerups that have been on screen for too long
    const now = Date.now();
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (now - powerUps[i].creationTime > POWERUP_DURATION) powerUps.splice(i, 1);
    }
}

function checkCollisions() {
    // Lasers vs Enemies
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            // Add check in case enemy was removed in the same frame
            if (!enemies[j]) continue;
            const e = enemies[j];
            const dx = l.x - e.x, dy = l.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (l.height / 2 + e.width / 2) * 0.85) { // Laser collision sensitivity
                lasers.splice(i, 1);
                enemies.splice(j, 1); // Use splice(j, 1) to remove the correct enemy
                playSound(killSound);
                score++;
                updateScoreAndLevel();
                break; // Laser disappears on hit
            }
        }
    }

    // Player vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        const dx = player.x - (p.x + p.width / 2);
        const dy = player.y - (p.y + p.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (player.width / 2 + p.width / 2) * 0.9) { // Powerup collision sensitivity
            applyPowerUp(p.type);
            powerUps.splice(i, 1);
        }
    }

    // Player vs Enemies
    if (!player.invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
             if (!enemies[i]) continue; // Extra check
            const e = enemies[i];
            const dx = player.x - e.x, dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Collision factor reduced slightly
            if (dist < (player.width / 2 + e.width / 2) * 0.70) {
                hitPlayer();
                // Optional: Destroy the hitting enemy
                // enemies.splice(i, 1);
                break; // Only one hit per frame
            }
        }
    }
}

// Function to handle player getting hit
function hitPlayer() {
    // If already invincible (from a recent previous hit), do nothing
    if (player.invincible) return;

    lives--;
    updateScoreAndLevel(); // Update lives display

    if (lives <= 0) {
        console.log("GAME OVER - Vidas agotadas.");
        gameOver("¡HAS PERDIDO!");
    } else {
        // Still have lives: clear area, reposition, grant invincibility
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const clearRadius = player.width * 2.5; // Radius to clear (larger)
        let enemiesCleared = 0;

        // Remove enemies near the center
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            if (Math.sqrt(dx * dx + dy * dy) < clearRadius) {
                enemies.splice(i, 1);
                enemiesCleared++;
            }
        }

        // Reposition and make invincible
        player.x = centerX;
        player.y = centerY;
        player.vx = 0;
        player.vy = 0;
        player.angle = -Math.PI / 2;
        player.invincible = true;
        player.invincibilityTimer = INVINCIBILITY_DURATION; // Reset full timer

        console.log(`Golpe! Vidas: ${lives}. ${enemiesCleared} enemigos cercanos eliminados. Invencible ${INVINCIBILITY_DURATION}ms.`);
        // You could add a "lose life" sound here
        // playSound(hitSound);
    }
}


function applyPowerUp(type) {
    if (type === 'fast_shot') { // Extra life (man.png)
        lives = Math.min(lives + 1, INITIAL_LIVES + 2); // Max 5 lives
        updateScoreAndLevel();
        console.log("Vida extra!");
        // playSound(lifeSound); // If you had a sound for extra life
    } else if (type === 'clear_screen') { // Clear screen (luc.png)
        score += enemies.length; // Points for destroyed enemies
        enemies = []; // Remove all enemies
        playSound(killSound); // Or a "bomb" sound
        updateScoreAndLevel();
        console.log("Pantalla despejada!");
    }
}

function updateScoreAndLevel() {
    scoreDisplay.textContent = `Puntaje: ${score}`;
    livesDisplay.textContent = `Vidas: ${lives}`;
    const previousLevel = level;
    level = Math.floor(score / POINTS_PER_LEVEL) + 1;
    if (level > previousLevel) {
        levelDisplay.textContent = `Nivel: ${level}`;
        playSound(newStageSound);
        // Make enemies spawn faster, with a lower limit
        enemySpawnRate = Math.max(30, enemySpawnRate * ENEMY_SPAWN_RATE_INCREASE);
        console.log(`Nivel ${level}! Spawn Rate: ${enemySpawnRate.toFixed(1)} frames`);
    }
}

// --- Drawing Functions ---

function drawPlayer() {
    // Blink effect if invincible
    if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        return; // Don't draw in this frame for blink effect
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    // Rotation depends on how your pla.png image is originally oriented.
    // If pla.png "looks up" by default: rotate(player.angle + Math.PI / 2)
    // If pla.png "looks right" by default: rotate(player.angle)
    // Assuming it looks up:
    ctx.rotate(player.angle + Math.PI / 2);
    ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    // Draw thruster if active
    if (player.thrusting) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle); // Use movement angle for thruster direction
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        // Simple triangle behind the player, adjusted to size
        const rearOffset = -player.height / 2 - 2; // A little behind the base of the ship
        ctx.moveTo(rearOffset, 5);
        ctx.lineTo(rearOffset - 8, 0); // Tip of the flame
        ctx.lineTo(rearOffset, -5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawLasers() {
    ctx.fillStyle = 'red';
    lasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle); // Rotate the laser rectangle
        ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height);
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        // Optional: rotate enemies based on their direction
        // ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI/2);
        ctx.drawImage(e.image, -e.width / 2, -e.height / 2, e.width, e.height);
        ctx.restore();
    });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        // Pulse visual effect to attract attention
        const pulse = Math.sin(Date.now() * 0.005) * 2; // +2px max size
        const w = p.width + pulse;
        const h = p.height + pulse;
        // Draw centered with the pulse
        ctx.drawImage(p.image, p.x - pulse / 2, p.y - pulse / 2, w, h);
    });
}

// --- Main Loop and Game Management ---

function gameLoop() {
    // If gameRunning was set to false (by gameOver), stop the loop
    if (!gameRunning) {
        console.log("Game loop stopping: gameRunning is false.");
        return;
    }

    // 1. Update State of all elements
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();

    // 2. Check Collisions (can change gameRunning to false if it calls gameOver)
    checkCollisions();

    // 3. Draw (only if the game is still active after collisions)
    if (gameRunning) {
        // Draw Background (clears the previous frame)
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        // Draw Game Elements
        drawEnemies();
        drawPowerUps();
        drawLasers();
        drawPlayer(); // Player on top

        // 4. Request the next animation frame
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
         console.log("Game loop detected gameRunning became false after checkCollisions. Halting.");
         // Do not request the next frame if the game ended in this cycle
    }
}

function startGame() {
    if (gameRunning) return; // Prevent double start if clicked quickly
    console.log("Starting game...");

    // Reset game state variables
    score = 0; level = 1; lives = INITIAL_LIVES;
    lasers = []; enemies = []; powerUps = []; keys = {};
    enemySpawnCounter = 0; enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
    player = { // Complete player object reset
        x: canvas.width / 2, y: canvas.height / 2,
        width: PLAYER_SIZE, height: PLAYER_SIZE,
        angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18,
        fireRateBoostTimer: 0,
        invincible: true, // Start with invincibility
        invincibilityTimer: INVINCIBILITY_DURATION // Use the defined constant
    };
    updateScoreAndLevel(); // Update UI (score, level, lives)

    // Update UI and game state
    gameRunning = true; // IMPORTANT: Mark as running BEFORE starting the loop
    startButton.style.display = 'none'; // Hide "Start" button
    // instructionDiv display is now handled by CSS media query
    // touchControlsDiv display is now handled by CSS media query

    // Start or resume background music
    bgMusic.volume = 0.2; // Low volume
    bgMusic.currentTime = 0; // Reset music
    bgMusic.play().catch(e => console.log("Music requires user interaction to start."));

    // Clear any pending animation frames and start the game loop
    cancelAnimationFrame(animationFrameId); // Good practice just in case
    animationFrameId = requestAnimationFrame(gameLoop);
    console.log("Game loop requested.");
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    // Only execute if the game WAS running
    if (!gameRunning) {
         console.log("gameOver called but game not running. Ignoring.");
         return; // Prevent multiple or accidental calls
    }
    console.log(`Game Over: ${message}`);

    gameRunning = false; // Stop the game IMMEDIATELY
    cancelAnimationFrame(animationFrameId); // Stop the animation loop
    bgMusic.pause(); // Pause music

    // Draw the final screen over the last game frame
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; // Semi-transparent dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = "20px Arial";
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);

    // Prepare UI to be able to restart the game
    startButton.textContent = "Jugar de Nuevo"; // Change button text
    startButton.style.display = 'block'; // Show button to restart
    // touchControlsDiv display is now handled by CSS media query
    // instructionDiv display is now handled by CSS media query
}

// --- Initialization ---
startButton.addEventListener('click', startGame); // The button starts the game

// Function to draw the initial screen before starting
function showInitialScreen() {
    // Ensure the game is not running and stop any loop
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);

    // Draw black background or background image
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
    // Draw semi-transparent text box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.4);
    // Draw texts
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDES INFINITO', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('¡Prepara tus láseres!', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Pulsa "Iniciar Juego"', canvas.width / 2, canvas.height / 2 + 40);

    // Ensure correct UI state
    // instructionDiv display is now handled by CSS media query
    // touchControlsDiv display is now handled by CSS media query
    startButton.textContent = "Iniciar Juego"; // Initial button text
    startButton.style.display = 'block'; // Show start button
}

// Wait for essential images to load and show the initial screen
let initialLoadCheck = setInterval(() => {
    // Wait for at least background and player to show something
    if (imagesLoadedCount >= 2) {
        clearInterval(initialLoadCheck);
        showInitialScreen();
    }
}, 100);
// Show screen anyway after 5 seconds if something fails
setTimeout(() => {
     clearInterval(initialLoadCheck);
     if (!gameRunning) { // Only if it hasn't started already for some reason
        showInitialScreen();
     }
}, 5000);