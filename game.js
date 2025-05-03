const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives'); // Añadido para mostrar vidas
const startButton = document.getElementById('startButton');
const mobileControls = document.getElementById('mobile-controls'); // Añadido: Referencia a controles móviles

// Añadido: Referencias a los elementos de control móvil
const dpadUp = document.getElementById('dpad-up');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const shootButtonMobile = document.getElementById('shootButtonMobile');


// --- Recursos ---
const playerImg = new Image();
playerImg.src = 'pla.png';

const bgImg = new Image();
bgImg.src = 'fondo.png';

const enemyImages = {
    lex: new Image(),
    mau: new Image()
};
enemyImages.lex.src = 'lex.png';
enemyImages.mau.src = 'mau.png';

const powerUpImages = {
    fast_shot: new Image(), // man.png
    clear_screen: new Image() // luc.png
};
powerUpImages.fast_shot.src = 'man.png';
powerUpImages.clear_screen.src = 'luc.png';

// Sonidos
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego ---
const PLAYER_SIZE = 60; // Ajustado: Aumenta el tamaño del jugador
const ENEMY_SIZE = 70;  // Ajustado: Aumenta el tamaño de los enemigos
const POWERUP_SIZE = 45; // Ajustado: Aumenta el tamaño de man/luc.png
const LASER_SPEED = 7;
const PLAYER_TURN_SPEED = 0.08; // Radianes por frame
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.5;
const ENEMY_SPEED_MAX = 1.5;
const MAX_SCORE = 1000;
const POINTS_PER_LEVEL = 10;
const POWERUP_CHANCE = 0.001; // Probabilidad por frame de que aparezca un power-up
const POWERUP_DURATION = 5000; // ms (5 segundos)
const RARE_POWERUP_CHANCE_MOD = 0.2; // Probabilidad relativa del 'luc.png' (20% de los powerups)
const ENEMY_SPAWN_RATE_INITIAL = 150; // Frames entre spawns al inicio
const ENEMY_SPAWN_RATE_INCREASE = 0.95; // Multiplicador por nivel (más rápido)
const INITIAL_LIVES = 3; // Añadido: Número inicial de vidas

let score = 0;
let level = 1;
let lives = INITIAL_LIVES; // Añadido: Variable para las vidas
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    angle: -Math.PI / 2, // Apuntando hacia arriba
    vx: 0,
    vy: 0,
    rotation: 0, // -1 for left, 1 for right, 0 for none
    thrusting: false,
    shootCooldown: 0,
    baseFireRate: 15, // Frames entre disparos
    currentFireRate: 15,
    fireRateBoostTimer: 0,
    invincible: false, // Añadido: Invulnerabilidad temporal
    invincibilityTimer: 0 // Añadido: Contador de invulnerabilidad
};

let lasers = [];
let enemies = [];
let powerUps = [];
let keys = {}; // Este objeto ahora manejará tanto el teclado como los controles táctiles

// --- Carga de Imágenes ---
let imagesLoaded = 0;
const totalImages = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length; // player + bg + enemies + powerups

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("Todas las imágenes cargadas.");
        // Podríamos habilitar el botón aquí, pero lo haremos al hacer clic por si acaso
    }
}

playerImg.onload = imageLoaded;
bgImg.onload = imageLoaded;
enemyImages.lex.onload = imageLoaded;
enemyImages.mau.onload = imageLoaded;
powerUpImages.fast_shot.onload = imageLoaded; // man.png
powerUpImages.clear_screen.onload = imageLoaded; // luc.png

// --- Controles (Adaptados para Teclado y Táctil) ---

// Manejo de eventos de teclado (sigue funcionando)
document.addEventListener('keydown', (e) => {
    // Solo si gameRunning para evitar mover la nave en la pantalla de inicio con el teclado
     if (gameRunning) {
        keys[e.code] = true;
        // Evitar que la página haga scroll con las flechas/espacio
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
     }
});

document.addEventListener('keyup', (e) => {
     if (gameRunning) {
        keys[e.code] = false;
     }
});

// *** Lógica para Controles Táctiles/Ratón ***

// Función para manejar el inicio de un toque o clic en un control
function handleControlStart(event, key) {
    // Prevenir el comportamiento táctil por defecto (scroll, zoom)
    if (event.cancelable) event.preventDefault();
    keys[key] = true; // Simula la pulsación de la tecla
    // console.log(`${key} pressed via touch/mouse`);
}

// Función para manejar el final de un toque o clic en un control
function handleControlEnd(event, key) {
     // event.preventDefault(); // No siempre necesario para touchend/mouseup
     keys[key] = false; // Simula la liberación de la tecla
     // console.log(`${key} released via touch/mouse`);
}

// Añadir listeners para eventos táctiles (prioridad para móviles)
if ('ontouchstart' in window) {
    // Eventos táctiles
    dpadUp.addEventListener('touchstart', (e) => handleControlStart(e, 'ArrowUp'), { passive: false }); // Flecha arriba = Acelerar
    dpadLeft.addEventListener('touchstart', (e) => handleControlStart(e, 'ArrowLeft'), { passive: false }); // Flecha izquierda = Girar izquierda
    dpadRight.addEventListener('touchstart', (e) => handleControlStart(e, 'ArrowRight'), { passive: false }); // Flecha derecha = Girar derecha
    shootButtonMobile.addEventListener('touchstart', (e) => handleControlStart(e, 'Space'), { passive: false }); // Botón de disparo = Espacio

    dpadUp.addEventListener('touchend', (e) => handleControlEnd(e, 'ArrowUp'));
    dpadLeft.addEventListener('touchend', (e) => handleControlEnd(e, 'ArrowLeft'));
    dpadRight.addEventListener('touchend', (e) => handleControlEnd(e, 'ArrowRight'));
    shootButtonMobile.addEventListener('touchend', (e) => handleControlEnd(e, 'Space'));

     // Manejar también touchcancel por si el toque se interrumpe o sale del elemento
    dpadUp.addEventListener('touchcancel', (e) => handleControlEnd(e, 'ArrowUp'));
    dpadLeft.addEventListener('touchcancel', (e) => handleControlEnd(e, 'ArrowLeft'));
    dpadRight.addEventListener('touchcancel', (e) => handleControlEnd(e, 'ArrowRight'));
    shootButtonMobile.addEventListener('touchcancel', (e) => handleControlEnd(e, 'Space'));

} else {
    // Eventos de ratón para probar en desktop o dispositivos sin touch
    // (Estos se activarán si no se detectan eventos táctiles)
    dpadUp.addEventListener('mousedown', (e) => handleControlStart(e, 'ArrowUp'));
    dpadLeft.addEventListener('mousedown', (e) => handleControlStart(e, 'ArrowLeft'));
    dpadRight.addEventListener('mousedown', (e) => handleControlStart(e, 'ArrowRight'));
    shootButtonMobile.addEventListener('mousedown', (e) => handleControlStart(e, 'Space'));

    // Usar mouseup en el documento para asegurar que el estado de la tecla se restablece
    // incluso si el ratón se levanta fuera del botón.
    document.addEventListener('mouseup', (e) => {
        if (keys['ArrowUp']) handleControlEnd(e, 'ArrowUp');
        if (keys['ArrowLeft']) handleControlEnd(e, 'ArrowLeft');
        if (keys['ArrowRight']) handleControlEnd(e, 'ArrowRight');
        if (keys['Space']) handleControlEnd(e, 'Space');
    });
     // Añadir mouseleave a los botones para casos específicos, aunque mouseup en document es más robusto
     dpadUp.addEventListener('mouseleave', (e) => { if (keys['ArrowUp']) handleControlEnd(e, 'ArrowUp'); });
     dpadLeft.addEventListener('mouseleave', (e) => { if (keys['ArrowLeft']) handleControlEnd(e, 'ArrowLeft'); });
     dpadRight.addEventListener('mouseleave', (e) => { if (keys['ArrowRight']) handleControlEnd(e, 'ArrowRight'); });
     shootButtonMobile.addEventListener('mouseleave', (e) => { if (keys['Space']) handleControlEnd(e, 'Space'); });
}


// --- Funciones del Juego ---
// ... (mantener las funciones playSound, wrapAround, updatePlayer, etc.) ...

function updatePlayer() {
    // Rotación - Ahora lee del objeto keys, que se actualiza con teclado O controles táctiles
    if (keys['ArrowLeft']) player.rotation = -PLAYER_TURN_SPEED;
    else if (keys['ArrowRight']) player.rotation = PLAYER_TURN_SPEED;
    else player.rotation = 0;
    player.angle += player.rotation;

    // Empuje (Thrust) - Ahora lee del objeto keys
    player.thrusting = keys['ArrowUp'];
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

    // Disparo - Ahora lee del objeto keys
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    if (keys['Space'] && player.shootCooldown <= 0) {
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }

    // Timer del power-up de disparo rápido
    if (player.fireRateBoostTimer > 0) {
        player.fireRateBoostTimer -= 1000 / 60; // Aproximado ms por frame
        if (player.fireRateBoostTimer <= 0) {
            player.currentFireRate = player.baseFireRate;
            console.log("Fire rate boost ended");
        }
    }

    // Timer de invulnerabilidad
    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60;
        if (player.invincibilityTimer <= 0) {
            player.invincible = false;
            console.log("Invincibility ended");
        }
    }
}

// ... (mantener shootLaser, updateLasers, spawnEnemy, updateEnemies,
// spawnPowerUp, updatePowerUps, checkCollisions, hitPlayer) ...


// Función para aplicar power-ups (ya la modificamos para vidas)
function applyPowerUp(type) {
    if (type === 'fast_shot') { // man.png power-up
        lives++;
        const maxLives = INITIAL_LIVES + 2; // Cap lives at 5
        if (lives > maxLives) {
             lives = maxLives;
        }
        updateScoreAndLevel();
        console.log("¡Vida extra obtenida!");
    } else if (type === 'clear_screen') { // luc.png power-up
        score += enemies.length;
        enemies = [];
        playSound(killSound);
        updateScoreAndLevel();
        console.log("¡Pantalla despejada!");
    }
}


function updateScoreAndLevel() {
    scoreDisplay.textContent = `Puntaje: ${score}`;
    livesDisplay.textContent = `Vidas: ${lives}`; // Añadido: Actualiza el display de vidas

    const previousLevel = level;
    level = Math.floor(score / POINTS_PER_LEVEL) + 1;

    if (level > previousLevel) {
        levelDisplay.textContent = `Nivel: ${level}`;
        playSound(newStageSound);
        // Aumentar dificultad
        enemySpawnRate *= ENEMY_SPAWN_RATE_INCREASE;
        console.log(`Level Up! New Spawn Rate Factor: ${enemySpawnRate}`);
    }
}

// ... (mantener drawPlayer, drawLasers, drawEnemies, drawPowerUps) ...

function gameLoop() {
    if (!gameRunning) return;

    // 1. Limpiar Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Dibujar Fondo
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // 3. Actualizar Estado
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();

    // 4. Comprobar Colisiones
    checkCollisions();

    // 5. Dibujar Elementos
    drawPlayer();
    drawLasers();
    drawEnemies();
    drawPowerUps();

    // 6. Solicitar Siguiente Frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    if (gameRunning) return;

    // Resetear estado del juego
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        angle: -Math.PI / 2,
        vx: 0,
        vy: 0,
        rotation: 0,
        thrusting: false,
        shootCooldown: 0,
        baseFireRate: 15,
        currentFireRate: 15,
        fireRateBoostTimer: 0,
        invincible: true,
        invincibilityTimer: 3000
    };
    lasers = [];
    enemies = [];
    powerUps = [];
    keys = {}; // Limpiar el estado de las teclas/controles al iniciar

    updateScoreAndLevel();

    gameRunning = true;
    startButton.style.display = 'none';
    document.getElementById('instructions').style.display = 'block'; // Mostrar instrucciones de teclado (se ocultarán con CSS en móvil)

    // Activar la interactividad de los controles móviles
    mobileControls.classList.add('active');


    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("El navegador bloqueó la reproducción automática de música."));

    gameLoop();
}

function gameOver(message = "¡Has Perdido!") {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // Desactivar la interactividad de los controles móviles al terminar el juego
    mobileControls.classList.remove('active');


    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "20px Arial";
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 30);

    startButton.textContent = "Jugar de Nuevo";
    startButton.style.display = 'block';
    // Las instrucciones se muestran o ocultan con CSS basado en el tamaño de pantalla
}


// --- Inicio del Juego ---
startButton.addEventListener('click', startGame);

// Mensaje inicial o preparación
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'white';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('¡Prepara tus láseres!', canvas.width / 2, canvas.height / 2 - 30);
ctx.fillText('Haz clic en "Iniciar Juego" cuando estés listo.', canvas.width / 2, canvas.height / 2);
// Las instrucciones iniciales se ocultan al inicio, y la media query de CSS las controlará después.
// document.getElementById('instructions').style.display = 'none'; // Esto se controla mejor con CSS ahora

// Desactivar controles móviles al cargar la página hasta que inicie el juego
mobileControls.classList.remove('active');
