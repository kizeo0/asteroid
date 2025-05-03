const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('startButton');

// Referencias a botones móviles
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnThrust = document.getElementById('btn-thrust');
const btnShoot = document.getElementById('btn-shoot');

// --- Recursos ---
const playerImg = new Image();
playerImg.src = 'pla.png';
const bgImg = new Image();
bgImg.src = 'fondo.png';
const enemyImages = { lex: new Image(), mau: new Image() };
enemyImages.lex.src = 'lex.png';
enemyImages.mau.src = 'mau.png';
const powerUpImages = { fast_shot: new Image(), clear_screen: new Image() };
powerUpImages.fast_shot.src = 'man.png';
powerUpImages.clear_screen.src = 'luc.png';

// Sonidos
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego ---
const PLAYER_SIZE = 100; // Ligeramente reducido para pantallas pequeñas
const ENEMY_SIZE = 60;  // Ligeramente reducido
const POWERUP_SIZE = 40; // Ligeramente reducido
const LASER_SPEED = 7;
const PLAYER_TURN_SPEED = 0.08;
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.5;
const ENEMY_SPEED_MAX = 1.5;
const MAX_SCORE = 1000;
const POINTS_PER_LEVEL = 10;
const POWERUP_CHANCE = 0.001;
const POWERUP_DURATION = 5000;
const RARE_POWERUP_CHANCE_MOD = 0.2;
const ENEMY_SPAWN_RATE_INITIAL = 150;
const ENEMY_SPAWN_RATE_INCREASE = 0.95;
const INITIAL_LIVES = 3;

let score = 0;
let level = 1;
let lives = INITIAL_LIVES;
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
let resizeTimeout; // Para el debounce

let player = {
    x: 400, // Valores iniciales que se sobreescribirán
    y: 300,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    angle: -Math.PI / 2,
    vx: 0, vy: 0, rotation: 0, thrusting: false,
    shootCooldown: 0, baseFireRate: 15, currentFireRate: 15, fireRateBoostTimer: 0,
    invincible: false, invincibilityTimer: 0
};

let lasers = [];
let enemies = [];
let powerUps = [];
let keys = {};

// --- Carga de Imágenes ---
let imagesLoadedCount = 0;
const totalImagesToLoad = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length;

function imageLoaded() {
    imagesLoadedCount++;
    // console.log(`Imagen cargada (${imagesLoadedCount}/${totalImagesToLoad})`); // Opcional: menos verboso
    if (imagesLoadedCount === totalImagesToLoad) {
        console.log("¡Todas las imágenes cargadas!");
        // Redibujar mensaje inicial por si el fondo cargó después del primer resize
        if (!gameRunning) {
            drawInitialMessage();
        }
    }
}

playerImg.onload = imageLoaded;
bgImg.onload = imageLoaded; // Asegurar que el fondo también llame
enemyImages.lex.onload = imageLoaded;
enemyImages.mau.onload = imageLoaded;
powerUpImages.fast_shot.onload = imageLoaded;
powerUpImages.clear_screen.onload = imageLoaded;


// --- Controles (Teclado y Táctil) ---
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

function handleTouchEvent(event, keyCode, isPressed) {
    event.preventDefault();
    keys[keyCode] = isPressed;
}

btnLeft.addEventListener('touchstart', (e) => handleTouchEvent(e, 'ArrowLeft', true), { passive: false });
btnLeft.addEventListener('touchend', (e) => handleTouchEvent(e, 'ArrowLeft', false), { passive: false });
btnLeft.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'ArrowLeft', false), { passive: false });

btnRight.addEventListener('touchstart', (e) => handleTouchEvent(e, 'ArrowRight', true), { passive: false });
btnRight.addEventListener('touchend', (e) => handleTouchEvent(e, 'ArrowRight', false), { passive: false });
btnRight.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'ArrowRight', false), { passive: false });

btnThrust.addEventListener('touchstart', (e) => handleTouchEvent(e, 'ArrowUp', true), { passive: false });
btnThrust.addEventListener('touchend', (e) => handleTouchEvent(e, 'ArrowUp', false), { passive: false });
btnThrust.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'ArrowUp', false), { passive: false });

btnShoot.addEventListener('touchstart', (e) => handleTouchEvent(e, 'Space', true), { passive: false });
btnShoot.addEventListener('touchend', (e) => handleTouchEvent(e, 'Space', false), { passive: false });
btnShoot.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'Space', false), { passive: false });


// --- Funciones del Juego ---

function playSound(sound) {
    const soundClone = sound.cloneNode();
    soundClone.volume = sound.volume;
    soundClone.play().catch(e => console.error("Error al reproducir sonido:", e));
}

function wrapAround(obj) {
    const margin = obj.width / 2; // Usar margen para que desaparezca completamente antes de reaparecer
    if (obj.x < -margin) obj.x = canvas.width + margin;
    if (obj.x > canvas.width + margin) obj.x = -margin;
    if (obj.y < -margin) obj.y = canvas.height + margin;
    if (obj.y > canvas.height + margin) obj.y = -margin;
}

function updatePlayer() {
    if (keys['ArrowLeft']) player.rotation = -PLAYER_TURN_SPEED;
    else if (keys['ArrowRight']) player.rotation = PLAYER_TURN_SPEED;
    else player.rotation = 0;
    player.angle += player.rotation;

    player.thrusting = keys['ArrowUp'];
    if (player.thrusting) {
        player.vx += Math.cos(player.angle) * PLAYER_THRUST;
        player.vy += Math.sin(player.angle) * PLAYER_THRUST;
    }

    player.vx *= FRICTION;
    player.vy *= FRICTION;
    player.x += player.vx;
    player.y += player.vy;
    wrapAround(player);

    if (player.shootCooldown > 0) player.shootCooldown--;
    if (keys['Space'] && player.shootCooldown <= 0) {
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }

    if (player.fireRateBoostTimer > 0) {
        player.fireRateBoostTimer -= 1000 / 60;
        if (player.fireRateBoostTimer <= 0) {
            player.currentFireRate = player.baseFireRate;
        }
    }

    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60;
        if (player.invincibilityTimer <= 0) {
            player.invincible = false;
        }
    }
}

function shootLaser() {
    const laserOriginDist = player.width / 2;
    const laserX = player.x + Math.cos(player.angle) * laserOriginDist;
    const laserY = player.y + Math.sin(player.angle) * laserOriginDist;
    lasers.push({
        x: laserX, y: laserY,
        vx: Math.cos(player.angle) * LASER_SPEED + player.vx * 0.5,
        vy: Math.sin(player.angle) * LASER_SPEED + player.vy * 0.5,
        width: 4, height: 10, angle: player.angle
    });
    playSound(shotSound);
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.x += laser.vx;
        laser.y += laser.vy;
        if (laser.x < 0 || laser.x > canvas.width || laser.y < 0 || laser.y > canvas.height) {
            lasers.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const margin = ENEMY_SIZE / 2;

    if (edge === 0) { x = Math.random() * canvas.width; y = -margin; } // Top
    else if (edge === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; } // Right
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; } // Bottom
    else { x = -margin; y = Math.random() * canvas.height; } // Left

    const angle = Math.atan2(player.y - y, player.x - x); // Apuntar hacia el jugador (opcional)
    // const angle = Math.random() * Math.PI * 2; // Dirección aleatoria original
    const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.1);

    enemies.push({
        x, y, width: ENEMY_SIZE, height: ENEMY_SIZE,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        type, image: enemyImages[type]
    });
}

function updateEnemies() {
    enemySpawnCounter++;
    if (enemySpawnCounter >= enemySpawnRate) {
        spawnEnemy();
        enemySpawnCounter = 0;
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        wrapAround(enemy);
    }
}

function spawnPowerUp() {
    const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot';
    powerUps.push({
        x: Math.random() * (canvas.width - POWERUP_SIZE),
        y: Math.random() * (canvas.height - POWERUP_SIZE),
        width: POWERUP_SIZE, height: POWERUP_SIZE, type,
        image: powerUpImages[type], creationTime: Date.now(), duration: 10000
    });
}

function updatePowerUps() {
    if (Math.random() < POWERUP_CHANCE && powerUps.length < 2) {
        spawnPowerUp();
    }
    const now = Date.now();
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (now - powerUps[i].creationTime > powerUps[i].duration) {
            powerUps.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Lasers vs Enemies
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = laser.x - enemy.x;
            const dy = laser.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (laser.height + enemy.width) / 2.5) { // Ajustado para laser.height
                enemies.splice(j, 1); // Corregido: antes era j, j + 1
                lasers.splice(i, 1);
                playSound(killSound);
                score++;
                updateScoreAndLevel();
                break;
            }
        }
    }

    // Player vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        const dx = player.x - (pu.x + pu.width / 2);
        const dy = player.y - (pu.y + pu.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (player.width / 2 + pu.width / 2) * 0.8) { // Radio más preciso
            applyPowerUp(pu.type);
            powerUps.splice(i, 1);
        }
    }

    // Player vs Enemies
    if (!player.invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (player.width / 2 + enemy.width / 2) * 0.7) {
                hitPlayer();
                break;
            }
        }
    }
}

function hitPlayer() {
    lives--;
    updateScoreAndLevel();
    if (lives <= 0) {
        gameOver("¡Has Perdido!");
    } else {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.vx = 0; player.vy = 0; player.angle = -Math.PI / 2;
        player.invincible = true;
        player.invincibilityTimer = 3000; // 3 segundos
    }
}

function applyPowerUp(type) {
    if (type === 'fast_shot') { // man.png ahora da vida extra
        lives++;
        const maxLives = INITIAL_LIVES + 2; // Límite opcional
        if (lives > maxLives) lives = maxLives;
        updateScoreAndLevel();
        // playSound(lifeSound); // Si tuvieras sonido de vida
    } else if (type === 'clear_screen') { // luc.png limpia pantalla
        score += enemies.length;
        enemies = [];
        playSound(killSound);
        updateScoreAndLevel();
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
        enemySpawnRate *= ENEMY_SPAWN_RATE_INCREASE;
    }
    // No detenemos el juego al llegar a MAX_SCORE
}

// --- Funciones de Dibujo ---

function drawPlayer() {
    let draw = true;
    if (player.invincible) {
        const blinkRate = 150;
        draw = (Date.now() % (blinkRate * 2)) < blinkRate;
    }
    if (draw) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
        // Dibujar propulsor (opcional)
        if (player.thrusting) {
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.moveTo(-player.width / 2, player.height * 0.3); // Base 1
            ctx.lineTo(-player.width / 2 - 10, 0); // Punta trasera
            ctx.lineTo(-player.width / 2, -player.height * 0.3); // Base 2
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}


function drawLasers() {
    for (const laser of lasers) {
        ctx.save();
        ctx.translate(laser.x, laser.y);
        ctx.rotate(laser.angle + Math.PI / 2);
        ctx.fillStyle = 'red';
        ctx.fillRect(-laser.width / 2, -laser.height / 2, laser.width, laser.height);
        ctx.restore();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.drawImage(enemy.image, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
    }
}

function drawPowerUps() {
    for (const pu of powerUps) {
        ctx.drawImage(pu.image, pu.x, pu.y, pu.width, pu.height);
    }
}

function drawBackground() {
    if (bgImg.complete && bgImg.naturalHeight !== 0) {
        // Escalar imagen de fondo para llenar canvas (cover)
        const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
        const canvasAspect = canvas.width / canvas.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (imgAspect > canvasAspect) {
            drawHeight = canvas.height; drawWidth = drawHeight * imgAspect;
            drawX = (canvas.width - drawWidth) / 2; drawY = 0;
        } else {
            drawWidth = canvas.width; drawHeight = drawWidth / imgAspect;
            drawX = 0; drawY = (canvas.height - drawHeight) / 2;
        }
        ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
    } else {
        // Fallback a fondo negro si la imagen no carga
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


// --- Bucle Principal y Estados ---

function gameLoop() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(); // Dibujar fondo primero
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();
    checkCollisions();
    drawLasers(); // Dibujar láseres encima del fondo pero debajo de naves/enemigos
    drawEnemies();
    drawPowerUps();
    drawPlayer(); // Dibujar jugador encima de todo
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    console.log("Iniciando juego..."); // Log
    if (gameRunning) return;
    score = 0; level = 1; lives = INITIAL_LIVES;
    player.x = canvas.width / 2; player.y = canvas.height / 2;
    player.vx = 0; player.vy = 0; player.angle = -Math.PI / 2;
    player.rotation = 0; player.thrusting = false; player.shootCooldown = 0;
    player.currentFireRate = player.baseFireRate; player.fireRateBoostTimer = 0;
    player.invincible = true; player.invincibilityTimer = 3000; // Invencibilidad inicial
    lasers = []; enemies = []; powerUps = []; keys = {};
    enemySpawnCounter = 0; enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
    updateScoreAndLevel();
    gameRunning = true;
    startButton.style.display = 'none';
    document.getElementById('instructions').style.display = 'block';
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.warn("Música bloqueada por navegador."));
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Cancelar frame anterior si existe
    gameLoop();
}

function gameOver(message = "¡Has Perdido!") {
    console.log("Juego terminado:", message); // Log
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // Dibujar pantalla final
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    const fontLarge = Math.max(24, Math.min(40, canvas.width / 15)); // Fuente responsive
    const fontSmall = Math.max(16, Math.min(20, canvas.width / 25));
    ctx.font = `${fontLarge}px Arial`;
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - fontLarge);
    ctx.font = `${fontSmall}px Arial`;
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 + fontSmall / 2);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + fontSmall * 2);

    startButton.textContent = "Jugar de Nuevo";
    startButton.style.display = 'block';
    document.getElementById('instructions').style.display = 'none';
}

// --- Redimensionamiento y Carga Inicial ---

function resizeCanvas() {
    console.log("Intentando redimensionar...");
    const container = document.getElementById('game-container');
    if (!container) return;
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) {
        console.warn("Ancho de contenedor 0, saltando redimensionamiento.");
        return;
    }

    const aspectRatio = 800 / 600;
    let newHeight = containerWidth / aspectRatio;
    let availableHeight = window.innerHeight;
    const titleElement = document.querySelector('h1');
    if (titleElement) availableHeight -= titleElement.offsetHeight;
    availableHeight -= 60; // Margen vertical (ajustar)

    canvas.height = Math.min(newHeight, availableHeight);
    canvas.width = canvas.height * aspectRatio;
    if (canvas.width > containerWidth) {
        canvas.width = containerWidth;
        canvas.height = containerWidth / aspectRatio;
    }
    // Asegurarse que las dimensiones no sean negativas o NaN
    canvas.width = Math.max(10, Math.round(canvas.width));
    canvas.height = Math.max(10, Math.round(canvas.height));


    console.log(`Canvas redimensionado a: ${canvas.width}x${canvas.height}`);

    // Redibujar estado apropiado
    if (gameRunning) {
        // El gameLoop se encargará en el siguiente frame.
        // Podríamos necesitar ajustar posiciones de elementos si no son relativos.
    } else {
        // Si el juego no ha iniciado, dibujar el mensaje/fondo
        drawInitialMessage();
    }
}

function drawInitialMessage() {
    if (!ctx) return;
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dibujar fondo (usando la función dedicada)
    drawBackground();
    // Dibujar texto encima
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
    ctx.fillStyle = 'white';
    const fontSize = Math.max(14, Math.min(20, canvas.width / 30));
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('¡Prepara tus láseres!', canvas.width / 2, canvas.height / 2 - fontSize * 1.5);
    ctx.fillText('Haz clic en "Iniciar Juego" / "Jugar de Nuevo"', canvas.width / 2, canvas.height / 2);
    ctx.fillText('cuando estés listo.', canvas.width / 2, canvas.height / 2 + fontSize * 1.5);
}

// --- Event Listeners Globales ---

// Debounce para resize
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 250); // Espera 250ms
});

// Carga inicial
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Redimensionando canvas inicial.");
    resizeCanvas(); // Primera redimensión
    document.getElementById('instructions').style.display = 'none';
    console.log("Inicialización lista. Esperando imágenes y clic.");
});

// Listener del botón Start
startButton.addEventListener('click', startGame);

// --- Fin del Script ---