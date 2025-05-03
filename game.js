// Variables globales (Canvas, Context, UI, Botones, etc.)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('startButton');
const gameContainer = document.getElementById('game-container'); // Contenedor del canvas
const touchControls = document.getElementById('touch-controls'); // Contenedor de controles

// --- Referencias a los botones táctiles ---
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnThrust = document.getElementById('btnThrust');
const btnShoot = document.getElementById('btnShoot');

// --- Recursos (Imágenes y Sonidos) ---
let imagesLoadedCount = 0;
let totalImages = 0;
let allImagesLoaded = false;

function loadImage(src) {
    totalImages++;
    const img = new Image();
    img.onload = () => {
        imagesLoadedCount++;
        console.log(`Imagen cargada: ${src} (${imagesLoadedCount}/${totalImages})`);
        if (imagesLoadedCount === totalImages) {
            allImagesLoaded = true;
            console.log("¡Todas las imágenes cargadas!");
            // Podríamos habilitar el botón Start aquí si quisiéramos
            // startButton.disabled = false;
        }
    };
    img.onerror = () => {
        console.error(`Error cargando imagen: ${src}`);
        // Podrías intentar cargar una imagen por defecto o manejar el error
    };
    img.src = src;
    return img;
}

const playerImg = loadImage('pla.png');
const bgImg = loadImage('fondo.png');
const enemyImages = {
    lex: loadImage('lex.png'),
    mau: loadImage('mau.png')
};
const powerUpImages = {
    fast_shot: loadImage('man.png'),
    clear_screen: loadImage('luc.png')
};

const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego (Ajustar tamaños si es necesario) ---
const PLAYER_SIZE_BASE = 60; // Tamaño base, se puede escalar con pantalla?
const ENEMY_SIZE_BASE = 40;
const POWERUP_SIZE_BASE = 30;
// ... resto de constantes (LASER_SPEED, FRICTION, etc. sin cambios) ...
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

// Adaptaremos tamaño real en resizeCanvas/startGame
let player = { x: 0, y: 0, width: PLAYER_SIZE_BASE, height: PLAYER_SIZE_BASE, angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false, shootCooldown: 0, baseFireRate: 15, currentFireRate: 15, fireRateBoostTimer: 0, invincible: false, invincibilityTimer: 0 };
let lasers = [];
let enemies = [];
let powerUps = [];
let keys = {};
let touchState = { left: false, right: false, thrust: false };

// --- NUEVO: Redimensionar Canvas ---
function resizeCanvas() {
    // Obtener tamaño del contenedor del canvas
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;

    // Ajustar las dimensiones del buffer de dibujo del canvas
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    console.log(`Canvas redimensionado a: ${canvas.width}x${canvas.height}`);

    // Opcional: Re-calcular tamaños/posiciones si dependen del tamaño del canvas
    // Por ejemplo, si los tamaños de los objetos deben escalar:
    // player.width = canvas.width * 0.1; // Ejemplo: jugador ocupa 10% del ancho
    // player.height = player.width; // Mantener aspecto

    // Reposicionar jugador si el juego está corriendo y se redimensiona
    // (Aunque en móvil es menos común redimensionar durante el juego)
    if (gameRunning) {
       // Podríamos recentrar el jugador si se sale mucho
       // player.x = canvas.width / 2;
       // player.y = canvas.height / 2;
    }
}

// --- Controles Táctiles y Teclado (Listeners como antes) ---
function handleTouchStart(event, control) { /* ... como antes ... */
    if (!gameRunning && control !== 'start') return;
    event.preventDefault();
    switch (control) {
        case 'left': touchState.left = true; break;
        case 'right': touchState.right = true; break;
        case 'thrust': touchState.thrust = true; break;
        case 'shoot':
            if (player.shootCooldown <= 0 && gameRunning) { // Asegurar que el juego corre
                shootLaser();
                player.shootCooldown = player.currentFireRate;
            }
            break;
    }
}
function handleTouchEnd(event, control) { /* ... como antes ... */
    switch (control) {
        case 'left': touchState.left = false; break;
        case 'right': touchState.right = false; break;
        case 'thrust': touchState.thrust = false; break;
    }
}
// Asignar listeners (como antes)
btnLeft.addEventListener('touchstart', (e) => handleTouchStart(e, 'left'), { passive: false });
btnLeft.addEventListener('touchend', (e) => handleTouchEnd(e, 'left'));
btnLeft.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'left'));
// ... listeners para btnRight, btnThrust, btnShoot ...
btnRight.addEventListener('touchstart', (e) => handleTouchStart(e, 'right'), { passive: false });
btnRight.addEventListener('touchend', (e) => handleTouchEnd(e, 'right'));
btnRight.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'right'));
btnThrust.addEventListener('touchstart', (e) => handleTouchStart(e, 'thrust'), { passive: false });
btnThrust.addEventListener('touchend', (e) => handleTouchEnd(e, 'thrust'));
btnThrust.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'thrust'));
btnShoot.addEventListener('touchstart', (e) => handleTouchStart(e, 'shoot'), { passive: false });

// Listeners de teclado (sin cambios)
document.addEventListener('keydown', (e) => { keys[e.code] = true; /* ... preventDefault ... */ });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });


// --- Funciones del Juego ---
// playSound, wrapAround (sin cambios)
function playSound(sound) { /* ... */ }
function wrapAround(obj) {
    // Usar dimensiones actuales del canvas
    if (obj.x < -obj.width / 2) obj.x = canvas.width + obj.width / 2;
    if (obj.x > canvas.width + obj.width / 2) obj.x = -obj.width / 2;
    if (obj.y < -obj.height / 2) obj.y = canvas.height + obj.height / 2;
    if (obj.y > canvas.height + obj.height / 2) obj.y = -obj.height / 2;
}
// updatePlayer (sin cambios en lógica interna, usa player.width/height actual)
function updatePlayer() { /* ... como antes ... */ }
// shootLaser (usa player.width/height actual)
function shootLaser() { /* ... como antes ... */ }
// updateLasers (usa canvas.width/height para límites)
function updateLasers() { /* ... como antes ... */ }
// spawnEnemy (usa canvas.width/height para bordes)
function spawnEnemy() {
     const type = Math.random() < 0.5 ? 'lex' : 'mau';
     const edge = Math.floor(Math.random() * 4);
     let x, y;
     const enemyWidth = ENEMY_SIZE_BASE; // Usar tamaño base o escalado
     const enemyHeight = ENEMY_SIZE_BASE;

     // Usar dimensiones actuales del canvas para spawn
     if (edge === 0) { x = Math.random() * canvas.width; y = -enemyHeight / 2; }
     else if (edge === 1) { x = canvas.width + enemyWidth / 2; y = Math.random() * canvas.height; }
     else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + enemyHeight / 2; }
     else { x = -enemyWidth / 2; y = Math.random() * canvas.height; }

     const angle = Math.random() * Math.PI * 2;
     const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.1);

     enemies.push({
         x: x, y: y,
         width: enemyWidth, height: enemyHeight, // Usar tamaño definido
         vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
         type: type, image: enemyImages[type]
     });
}
// updateEnemies (sin cambios)
function updateEnemies() { /* ... como antes ... */ }
// spawnPowerUp (usa canvas.width/height)
function spawnPowerUp() { /* ... usa POWERUP_SIZE_BASE ... */ }
// updatePowerUps (sin cambios)
function updatePowerUps() { /* ... */ }
// checkCollisions (usa tamaños actuales)
function checkCollisions() { /* ... como antes ... */ }
// hitPlayer (sin cambios)
function hitPlayer() { /* ... como antes ... */ }
// applyPowerUp (sin cambios)
function applyPowerUp(type) { /* ... como antes ... */ }
// updateScoreAndLevel (sin cambios)
function updateScoreAndLevel() { /* ... */ }
// drawPlayer (usa player.width/height actual)
function drawPlayer() { /* ... como antes ... */ }
// drawLasers (sin cambios)
function drawLasers() { /* ... como antes ... */ }
// drawEnemies (usa enemy.width/height actual)
function drawEnemies() { /* ... como antes ... */ }
// drawPowerUps (usa pu.width/height actual)
function drawPowerUps() { /* ... como antes ... */ }

// --- MODIFICADO: gameLoop (Verifica imagen de fondo) ---
function gameLoop() {
    if (!gameRunning) return;

    // 1. Limpiar Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Dibujar Fondo (SOLO si está cargado y listo)
    if (bgImg.complete && bgImg.naturalWidth !== 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        // Fondo alternativo mientras carga o si falla
        ctx.fillStyle = '#001'; // Azul muy oscuro
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Opcional: Mostrar mensaje de carga
        // ctx.fillStyle = 'white';
        // ctx.fillText('Cargando...', canvas.width / 2, canvas.height / 2);
    }

    // 3. Actualizar Estado (Solo si el juego corre)
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();

    // 4. Comprobar Colisiones
    checkCollisions();

    // 5. Dibujar Elementos (Solo si las imágenes están listas o manejar caso contrario)
    // Asegurarse que drawPlayer/Enemies/etc no fallen si su imagen no está lista
    if (playerImg.complete && playerImg.naturalWidth !== 0) {
        drawPlayer();
    }
    drawLasers(); // Los láseres no dependen de imágenes externas
    // Para enemigos y powerups, podríamos iterar y solo dibujar los cuya imagen esté lista
    drawEnemies(); // Asumiendo que checkCollisions los elimina si no tienen imagen? Mejorar si es necesario.
    drawPowerUps();

    // 6. Solicitar Siguiente Frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- MODIFICADO: startGame ---
function startGame() {
    // No iniciar si ya está corriendo o si las imágenes esenciales no están listas
    if (gameRunning || !allImagesLoaded) {
        console.warn("Intento de iniciar juego prematuramente o ya iniciado.");
        // Opcional: Mostrar mensaje al usuario
        if (!allImagesLoaded) {
             alert("El juego aún está cargando recursos. Intenta de nuevo en un momento.");
        }
        return;
    }

    console.log("Iniciando juego...");

    // 1. Asegurar tamaño correcto del canvas ANTES de posicionar elementos
    resizeCanvas();

    // 2. Resetear estado del juego
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    player = { // Resetear posición usando dimensiones ACTUALES del canvas
        x: canvas.width / 2,
        y: canvas.height * 0.8, // Empezar más abajo en pantalla vertical
        width: PLAYER_SIZE_BASE, // Usar tamaño base o escalado
        height: PLAYER_SIZE_BASE,
        angle: -Math.PI / 2, // Apuntando arriba
        vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 15, currentFireRate: 15,
        fireRateBoostTimer: 0, invincible: true, invincibilityTimer: 3000 // Invencible al inicio
    };
    lasers = [];
    enemies = [];
    powerUps = [];
    keys = {};
    touchState = { left: false, right: false, thrust: false }; // Resetear estado táctil
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

    updateScoreAndLevel(); // Actualiza UI

    // 3. Cambiar visibilidad de elementos
    gameRunning = true;
    startButton.style.display = 'none'; // Ocultar botón de inicio
    touchControls.style.display = 'flex'; // Mostrar controles táctiles

    // 4. Iniciar música (ya estaba)
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("Música bloqueada por navegador.", e));

    // 5. Iniciar el bucle (cancelar cualquier bucle anterior por si acaso)
    cancelAnimationFrame(animationFrameId); // Por si acaso
    gameLoop();
}

// --- gameOver (sin cambios grandes, usa canvas.width/height actual) ---
function gameOver(message = "¡Has Perdido!") {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // Dibujar pantalla de Game Over (usar canvas.width/height actual)
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    // Adaptar tamaño de fuente a pantalla?
    ctx.font = `bold ${Math.min(canvas.width * 0.1, 40)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = `bold ${Math.min(canvas.width * 0.05, 20)}px Arial`;
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 40);


    startButton.textContent = "Jugar de Nuevo";
    startButton.style.display = 'block'; // Mostrar botón para reiniciar
    touchControls.style.display = 'none'; // Ocultar controles táctiles
}


// --- Inicialización al Cargar la Página ---

// 1. Redimensionar el canvas inicialmente y añadir listener para futuros cambios
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas); // Para móviles
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Redimensionando canvas inicial.");
    resizeCanvas(); // Llamada inicial después de que el DOM está listo

    // Mostrar mensaje inicial en el canvas (opcional)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Cargando...', canvas.width / 2, canvas.height / 2);

    // Ocultar controles táctiles inicialmente
    touchControls.style.display = 'none';

    // Deshabilitar botón Start hasta que carguen las imágenes
    // startButton.disabled = true; // Descomentar si se activa en loadImage

    // Listener del botón Start
    startButton.addEventListener('click', startGame);

    console.log("Inicialización completa. Esperando carga de imágenes y clic en Start.");
});