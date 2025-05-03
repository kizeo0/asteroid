const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('startButton');

// --- Añadir referencias a los botones táctiles ---
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnThrust = document.getElementById('btnThrust');
const btnShoot = document.getElementById('btnShoot');

// --- Recursos (sin cambios) ---
const playerImg = new Image();
playerImg.src = 'pla.png';
// ... resto de imágenes y sonidos ...
const bgImg = new Image();
bgImg.src = 'fondo.png';
const enemyImages = { lex: new Image(), mau: new Image() };
enemyImages.lex.src = 'lex.png'; enemyImages.mau.src = 'mau.png';
const powerUpImages = { fast_shot: new Image(), clear_screen: new Image() };
powerUpImages.fast_shot.src = 'man.png'; powerUpImages.clear_screen.src = 'luc.png';
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego (Ajustar tamaños si es necesario para pantalla vertical) ---
const PLAYER_SIZE = 80; // Más pequeño para pantalla vertical? Ajusta según veas
const ENEMY_SIZE = 50;  // Más pequeño?
const POWERUP_SIZE = 35; // Más pequeño?
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

// --- Estado del Juego ---
let score = 0;
let level = 1;
let lives = INITIAL_LIVES;
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

let player = {
    // Posición inicial centrada en el nuevo canvas
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    angle: -Math.PI / 2, // Apuntando arriba
    vx: 0,
    vy: 0,
    rotation: 0,
    thrusting: false,
    shootCooldown: 0,
    baseFireRate: 15,
    currentFireRate: 15,
    fireRateBoostTimer: 0,
    invincible: false,
    invincibilityTimer: 0
};

let lasers = [];
let enemies = [];
let powerUps = [];
let keys = {}; // Mantenemos para posible uso de teclado en PC

// --- Nuevo: Estado de los controles táctiles ---
let touchState = {
    left: false,
    right: false,
    thrust: false
    // No necesitamos estado para 'shoot', se dispara al tocar
};

// --- Carga de Imágenes (sin cambios) ---
// ... código de imageLoaded ...
let imagesLoaded = 0;
const totalImages = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length;
function imageLoaded() { imagesLoaded++; /* ... */ }
playerImg.onload = imageLoaded; bgImg.onload = imageLoaded;
enemyImages.lex.onload = imageLoaded; enemyImages.mau.onload = imageLoaded;
powerUpImages.fast_shot.onload = imageLoaded; powerUpImages.clear_screen.onload = imageLoaded;

// --- Controles de Teclado (se mantienen) ---
document.addEventListener('keydown', (e) => { keys[e.code] = true; /* ... preventDefault ... */ });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Nuevo: Controles Táctiles ---
function handleTouchStart(event, control) {
    if (!gameRunning && control !== 'start') return; // No procesar controles si el juego no corre (excepto start)
    event.preventDefault(); // Evitar scroll/zoom/etc.
    switch (control) {
        case 'left': touchState.left = true; break;
        case 'right': touchState.right = true; break;
        case 'thrust': touchState.thrust = true; break;
        case 'shoot':
            // Disparar directamente al tocar, si no hay cooldown
            if (player.shootCooldown <= 0) {
                shootLaser();
                player.shootCooldown = player.currentFireRate;
            }
            break;
    }
}

function handleTouchEnd(event, control) {
    // No necesitamos preventDefault en touchend normalmente
    switch (control) {
        case 'left': touchState.left = false; break;
        case 'right': touchState.right = false; break;
        case 'thrust': touchState.thrust = false; break;
        // No hacemos nada en touchend para 'shoot'
    }
}

// Asignar listeners a los botones
btnLeft.addEventListener('touchstart', (e) => handleTouchStart(e, 'left'), { passive: false });
btnLeft.addEventListener('touchend', (e) => handleTouchEnd(e, 'left'));
btnLeft.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'left')); // Si se interrumpe el toque

btnRight.addEventListener('touchstart', (e) => handleTouchStart(e, 'right'), { passive: false });
btnRight.addEventListener('touchend', (e) => handleTouchEnd(e, 'right'));
btnRight.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'right'));

btnThrust.addEventListener('touchstart', (e) => handleTouchStart(e, 'thrust'), { passive: false });
btnThrust.addEventListener('touchend', (e) => handleTouchEnd(e, 'thrust'));
btnThrust.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'thrust'));

btnShoot.addEventListener('touchstart', (e) => handleTouchStart(e, 'shoot'), { passive: false });
// No necesitamos touchend/touchcancel para shoot si es instantáneo


// --- Funciones del Juego (playSound, wrapAround sin cambios) ---
function playSound(sound) { /* ... */ }
function wrapAround(obj) { /* ... */ }


// --- MODIFICADO: updatePlayer ---
function updatePlayer() {
    // Rotación (Considera teclado Y Táctil)
    if (keys['ArrowLeft'] || touchState.left) player.rotation = -PLAYER_TURN_SPEED;
    else if (keys['ArrowRight'] || touchState.right) player.rotation = PLAYER_TURN_SPEED;
    else player.rotation = 0;
    player.angle += player.rotation;

    // Empuje (Thrust) (Considera teclado Y Táctil)
    player.thrusting = keys['ArrowUp'] || touchState.thrust;
    if (player.thrusting) {
        player.vx += Math.cos(player.angle) * PLAYER_THRUST;
        player.vy += Math.sin(player.angle) * PLAYER_THRUST;
    }

    // Aplicar Fricción
    player.vx *= FRICTION;
    player.vy *= FRICTION;

    // Mover Nave
    player.x += player.vx;
    player.y += player.vy;

    // Wrap Around Screen Edges
    wrapAround(player);

    // Disparo (Cooldown y Teclado)
    // El disparo táctil se maneja en handleTouchStart
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    if (keys['Space'] && player.shootCooldown <= 0) { // Mantener disparo con espacio
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }

    // Timer del power-up (sin cambios)
    if (player.fireRateBoostTimer > 0) { /* ... */ }

    // Timer de invulnerabilidad (sin cambios)
    if (player.invincible) { /* ... */ }
}

// --- shootLaser (sin cambios, verifica si necesita ajustes por tamaño de jugador) ---
function shootLaser() {
    const laserOriginDist = player.width / 2; // Usar ancho si la nave apunta "horizontalmente" en la imagen
    const laserX = player.x + Math.cos(player.angle) * laserOriginDist;
    const laserY = player.y + Math.sin(player.angle) * laserOriginDist;

    const laser = {
        x: laserX, y: laserY,
        vx: Math.cos(player.angle) * LASER_SPEED + player.vx * 0.5,
        vy: Math.sin(player.angle) * LASER_SPEED + player.vy * 0.5,
        width: 4, height: 10, angle: player.angle
    };
    lasers.push(laser);
    playSound(shotSound);
}

// --- updateLasers (sin cambios) ---
function updateLasers() { /* ... */ }

// --- spawnEnemy (sin cambios, usa canvas.width/height dinámicamente) ---
function spawnEnemy() { /* ... */ }

// --- updateEnemies (sin cambios) ---
function updateEnemies() { /* ... */ }

// --- spawnPowerUp (sin cambios, usa canvas.width/height) ---
function spawnPowerUp() { /* ... */ }

// --- updatePowerUps (sin cambios) ---
function updatePowerUps() { /* ... */ }

// --- checkCollisions (sin cambios, verifica si radios necesitan ajuste) ---
function checkCollisions() { /* ... */ }

// --- hitPlayer (sin cambios) ---
function hitPlayer() { /* ... */ }

// --- applyPowerUp (sin cambios) ---
function applyPowerUp(type) { /* ... */ }

// --- updateScoreAndLevel (sin cambios) ---
function updateScoreAndLevel() { /* ... */ }

// --- drawPlayer (sin cambios) ---
function drawPlayer() { /* ... */ }

// --- drawLasers (sin cambios) ---
function drawLasers() { /* ... */ }

// --- drawEnemies (sin cambios) ---
function drawEnemies() { /* ... */ }

// --- drawPowerUps (sin cambios) ---
function drawPowerUps() { /* ... */ }

// --- gameLoop (sin cambios) ---
function gameLoop() { /* ... */ }

// --- startGame (Asegurar reset de player y ocultar/mostrar controles) ---
function startGame() {
    if (gameRunning) return;

    // Resetear estado del juego
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    player = { // Resetear usando las dimensiones actuales del canvas
        x: canvas.width / 2,
        y: canvas.height / 2, // Ajustar si la nave no debe empezar justo en medio verticalmente
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        angle: -Math.PI / 2,
        vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 15, currentFireRate: 15,
        fireRateBoostTimer: 0, invincible: true, invincibilityTimer: 3000
    };
    lasers = [];
    enemies = [];
    powerUps = [];
    keys = {};
     // Resetear estado táctil por si acaso
    touchState = { left: false, right: false, thrust: false };
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

    updateScoreAndLevel();

    gameRunning = true;
    startButton.style.display = 'none';
    document.getElementById('touch-controls').style.display = 'flex'; // Mostrar controles táctiles
    // Ocultar instrucciones si estaban visibles
    // document.getElementById('instructions').style.display = 'none';

    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("Música bloqueada por navegador."));

    gameLoop();
}

// --- gameOver (Ocultar controles táctiles) ---
function gameOver(message = "¡Has Perdido!") {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // Mostrar mensaje (ajustar tamaño de fuente si es necesario)
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "30px Arial"; // Tal vez más pequeño
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "18px Arial"; // Tal vez más pequeño
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 30);

    startButton.textContent = "Jugar de Nuevo";
    startButton.style.display = 'block';
    document.getElementById('touch-controls').style.display = 'none'; // Ocultar controles
}


// --- Inicio del Juego ---
startButton.addEventListener('click', startGame);

// --- Estado Inicial ---
// Ocultar controles táctiles al principio
document.getElementById('touch-controls').style.display = 'none';

// Mensaje inicial (ajustar tamaño fuente)
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'white';
ctx.font = '18px Arial';
ctx.textAlign = 'center';
ctx.fillText('¡Listo para la acción!', canvas.width / 2, canvas.height / 2 - 30);
ctx.fillText('Pulsa "Iniciar Juego"', canvas.width / 2, canvas.height / 2);
// document.getElementById('instructions').style.display = 'none'; // Ya no se usa