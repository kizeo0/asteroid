// ========================================================================= //
//                                                                           //
//                CONTENIDO COMPLETO DE game.js (Versión Corregida v3)       //
//                                                                           //
// ========================================================================= //

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('startButton');
const instructionsDiv = document.getElementById('instructions');
const touchControlsDiv = document.getElementById('touch-controls');

// --- Referencias a Botones Táctiles ---
const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
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
const PLAYER_SIZE = 60;
const ENEMY_SIZE = 45;
const POWERUP_SIZE = 30;
const LASER_SPEED = 6;
const PLAYER_TURN_SPEED = 0.09;
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.4;
const ENEMY_SPEED_MAX = 1.2;
const POINTS_PER_LEVEL = 10;
const POWERUP_CHANCE = 0.0015;
const POWERUP_DURATION = 8000; // Powerups duran 8 seg en pantalla
const RARE_POWERUP_CHANCE_MOD = 0.2;
const ENEMY_SPAWN_RATE_INITIAL = 140;
const ENEMY_SPAWN_RATE_INCREASE = 0.96;
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 3500; // 3.5 segundos de invencibilidad <--- CORRECCIÓN

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
let keys = {}; // Objeto para rastrear teclas/botones presionados

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
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Funciones para manejar eventos táctiles
function handleTouchStart(e, keyCode) { e.preventDefault(); keys[keyCode] = true; }
function handleTouchEnd(e, keyCode) { e.preventDefault(); keys[keyCode] = false; }

// Asignar listeners a los botones táctiles
[{el: dpadUp, key: 'ArrowUp'}, {el: dpadDown, key: 'ArrowDown'}, {el: dpadLeft, key: 'ArrowLeft'}, {el: dpadRight, key: 'ArrowRight'}, {el: shootButton, key: 'Space'}].forEach(item => {
    item.el.addEventListener('touchstart', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('touchend', (e) => handleTouchEnd(e, item.key), { passive: false });
    item.el.addEventListener('mousedown', (e) => e.preventDefault()); // Evitar clics fantasma
});
touchControlsDiv.style.display = 'none'; // Ocultar controles al inicio


// --- Funciones del Juego ---

function playSound(sound) {
    const clone = sound.cloneNode();
    clone.volume = sound.volume; // Usar volumen base del elemento original
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
    // Rotación
    player.rotation = keys['ArrowLeft'] ? -PLAYER_TURN_SPEED : (keys['ArrowRight'] ? PLAYER_TURN_SPEED : 0);
    player.angle += player.rotation;

    // Empuje
    player.thrusting = keys['ArrowUp'];
    if (player.thrusting) {
        player.vx += Math.cos(player.angle) * PLAYER_THRUST;
        player.vy += Math.sin(player.angle) * PLAYER_THRUST;
    }

    // Fricción y Movimiento
    player.vx *= FRICTION;
    player.vy *= FRICTION;
    player.x += player.vx;
    player.y += player.vy;
    wrapAround(player);

    // Disparo
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (keys['Space'] && player.shootCooldown <= 0) {
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }

    // Invencibilidad
    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60; // ~16.67ms por frame
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

// *** CORRECCIÓN: spawnEnemy con margen aumentado ***
function spawnEnemy() {
    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    const edge = Math.floor(Math.random() * 4);
    const w = canvas.width, h = canvas.height;
    const margin = ENEMY_SIZE * 1.5; // Aparecen más lejos del borde <--- CORRECCIÓN
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
    const maxEnemies = 12 + level * 2; // Límite de enemigos en pantalla
    if (enemySpawnCounter >= enemySpawnRate && enemies.length < maxEnemies) {
        spawnEnemy();
        enemySpawnCounter = 0;
    }
    // Mover y envolver enemigos existentes
    enemies.forEach(e => { e.x += e.vx; e.y += e.vy; wrapAround(e); });
}

function spawnPowerUp() {
    const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot'; // fast_shot da vida
    powerUps.push({
        x: Math.random() * (canvas.width - POWERUP_SIZE),
        y: Math.random() * (canvas.height - POWERUP_SIZE),
        width: POWERUP_SIZE, height: POWERUP_SIZE, type: type,
        image: powerUpImages[type], creationTime: Date.now()
    });
}

function updatePowerUps() {
    // Spawnea nuevos powerups aleatoriamente
    if (Math.random() < POWERUP_CHANCE && powerUps.length < 2) spawnPowerUp();
    // Elimina powerups que llevan mucho tiempo en pantalla
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
            // Añadir chequeo por si el enemigo fue eliminado en el mismo frame
            if (!enemies[j]) continue;
            const e = enemies[j];
            const dx = l.x - e.x, dy = l.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (l.height / 2 + e.width / 2) * 0.85) { // Sensibilidad colisión laser
                lasers.splice(i, 1);
                enemies.splice(j, 1);
                playSound(killSound);
                score++;
                updateScoreAndLevel();
                break; // Laser desaparece al golpear
            }
        }
    }

    // Player vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        const dx = player.x - (p.x + p.width / 2);
        const dy = player.y - (p.y + p.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (player.width / 2 + p.width / 2) * 0.9) { // Sensibilidad colisión powerup
            applyPowerUp(p.type);
            powerUps.splice(i, 1);
        }
    }

    // Player vs Enemies
    if (!player.invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
             if (!enemies[i]) continue; // Chequeo extra
            const e = enemies[i];
            const dx = player.x - e.x, dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
             // *** CORRECCIÓN: Factor de colisión reducido ***
            if (dist < (player.width / 2 + e.width / 2) * 0.70) { // Antes 0.75
                hitPlayer();
                // Opcional: Destruir enemigo que golpeó
                // enemies.splice(i, 1);
                break; // Solo un golpe por frame
            }
        }
    }
}

// *** CORRECCIÓN: hitPlayer modificado para limpiar área ***
function hitPlayer() {
    // Si ya es invencible (por un golpe anterior reciente), no hacer nada
    if (player.invincible) return;

    lives--;
    updateScoreAndLevel(); // Actualiza display vidas

    if (lives <= 0) {
        console.log("GAME OVER - Vidas agotadas.");
        gameOver("¡HAS PERDIDO!");
    } else {
        // Aún quedan vidas: limpiar área, reposicionar, dar invencibilidad
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const clearRadius = player.width * 2.5; // Radio a limpiar (más grande)
        let enemiesCleared = 0;

        // Eliminar enemigos cercanos al centro
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dx = enemy.x - centerX;
            const dy = enemy.y - centerY;
            if (Math.sqrt(dx * dx + dy * dy) < clearRadius) {
                enemies.splice(i, 1);
                enemiesCleared++;
            }
        }

        // Reposicionar y hacer invencible
        player.x = centerX;
        player.y = centerY;
        player.vx = 0;
        player.vy = 0;
        player.angle = -Math.PI / 2;
        player.invincible = true;
        player.invincibilityTimer = INVINCIBILITY_DURATION; // Resetear timer completo

        console.log(`Golpe! Vidas: ${lives}. ${enemiesCleared} enemigos cercanos eliminados. Invencible ${INVINCIBILITY_DURATION}ms.`);
        // Podrías añadir un sonido de "perder vida" aquí
        // playSound(hitSound);
    }
}


function applyPowerUp(type) {
    if (type === 'fast_shot') { // Vida extra (man.png)
        lives = Math.min(lives + 1, INITIAL_LIVES + 2); // Max 5 vidas
        updateScoreAndLevel();
        console.log("Vida extra!");
        // playSound(lifeSound); // Si tuvieras sonido para vida extra
    } else if (type === 'clear_screen') { // Limpiar pantalla (luc.png)
        score += enemies.length; // Puntos por enemigos destruidos
        enemies = []; // Eliminar todos los enemigos
        playSound(killSound); // O un sonido tipo "bomba"
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
        // Hacer que los enemigos spawneen más rápido, con un límite inferior
        enemySpawnRate = Math.max(30, enemySpawnRate * ENEMY_SPAWN_RATE_INCREASE);
        console.log(`Nivel ${level}! Spawn Rate: ${enemySpawnRate.toFixed(1)} frames`);
    }
}

// --- Funciones de Dibujo ---

function drawPlayer() {
    // Parpadeo si es invencible
    if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        return; // No dibujar en este frame para efecto parpadeo
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    // La rotación depende de cómo está orientada tu imagen pla.png originalmente.
    // Si pla.png "mira hacia arriba" por defecto: rotar(player.angle + Math.PI / 2)
    // Si pla.png "mira hacia la derecha" por defecto: rotar(player.angle)
    // Asumiendo que mira hacia arriba:
    ctx.rotate(player.angle + Math.PI / 2);
    ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    // Dibujar propulsor si está activo
    if (player.thrusting) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle); // Usar el ángulo de movimiento para la dirección del propulsor
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        // Triángulo simple detrás del jugador, ajustado al tamaño
        const rearOffset = -player.height / 2 - 2; // Un poco detrás de la base de la nave
        ctx.moveTo(rearOffset, 5);
        ctx.lineTo(rearOffset - 8, 0); // Punta del fuego
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
        ctx.rotate(l.angle); // Rotar el rectángulo del láser
        ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height);
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        // Opcional: rotar enemigos según su dirección
        // ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI/2);
        ctx.drawImage(e.image, -e.width / 2, -e.height / 2, e.width, e.height);
        ctx.restore();
    });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        // Efecto visual de pulso para llamar la atención
        const pulse = Math.sin(Date.now() * 0.005) * 2; // +2px de tamaño max
        const w = p.width + pulse;
        const h = p.height + pulse;
        // Dibujar centrado con el pulso
        ctx.drawImage(p.image, p.x - pulse / 2, p.y - pulse / 2, w, h);
    });
}

// --- Bucle Principal y Gestión del Juego ---

function gameLoop() {
    // Si gameRunning se puso a false (por gameOver), detener el bucle
    if (!gameRunning) {
        console.log("Game loop stopping: gameRunning is false.");
        return;
    }

    // 1. Actualizar Estado de todos los elementos
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();

    // 2. Comprobar Colisiones (puede cambiar gameRunning a false si llama a gameOver)
    checkCollisions();

    // 3. Dibujar (solo si el juego sigue activo después de colisiones)
    if (gameRunning) {
        // Dibujar Fondo (limpia el frame anterior)
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        // Dibujar Elementos del juego
        drawEnemies();
        drawPowerUps();
        drawLasers();
        drawPlayer(); // Jugador encima de los demás

        // 4. Solicitar el siguiente frame de animación
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
         console.log("Game loop detected gameRunning became false after checkCollisions. Halting.");
         // No solicitar el siguiente frame si el juego terminó en este ciclo
    }
}

function startGame() {
    if (gameRunning) return; // Evitar doble inicio si se hace clic rápido
    console.log("Starting game...");

    // Resetear variables del juego
    score = 0; level = 1; lives = INITIAL_LIVES;
    lasers = []; enemies = []; powerUps = []; keys = {};
    enemySpawnCounter = 0; enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
    player = { // Reset completo del objeto jugador
        x: canvas.width / 2, y: canvas.height / 2,
        width: PLAYER_SIZE, height: PLAYER_SIZE,
        angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18,
        fireRateBoostTimer: 0,
        invincible: true, // Empezar siendo invencible
        invincibilityTimer: INVINCIBILITY_DURATION // Usar la constante definida
    };
    updateScoreAndLevel(); // Actualizar UI (puntaje, nivel, vidas)

    // Actualizar UI y estado del juego
    gameRunning = true; // IMPORTANTE: Marcar como corriendo ANTES de empezar el bucle
    startButton.style.display = 'none'; // Ocultar botón "Iniciar"
    instructionsDiv.style.display = 'none'; // Ocultar instrucciones
    touchControlsDiv.style.display = 'flex'; // Mostrar controles táctiles

    // Iniciar o reanudar música de fondo
    bgMusic.volume = 0.2; // Volumen bajo
    bgMusic.currentTime = 0; // Reiniciar música
    bgMusic.play().catch(e => console.log("Música necesita interacción del usuario para empezar."));

    // Limpiar cualquier animación pendiente y empezar el bucle del juego
    cancelAnimationFrame(animationFrameId); // Buena práctica por si acaso
    animationFrameId = requestAnimationFrame(gameLoop);
    console.log("Game loop requested.");
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    // Solo ejecutar si el juego ESTABA corriendo
    if (!gameRunning) {
         console.log("gameOver called but game not running. Ignoring.");
         return; // Evitar llamadas múltiples o accidentales
    }
    console.log(`Game Over: ${message}`);

    gameRunning = false; // Detener el juego INMEDIATAMENTE
    cancelAnimationFrame(animationFrameId); // Detener el bucle de animación
    bgMusic.pause(); // Pausar música

    // Dibujar la pantalla final sobre el último frame del juego
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; // Fondo oscuro semitransparente
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = "20px Arial";
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);

    // Preparar la UI para poder reiniciar el juego
    startButton.textContent = "Jugar de Nuevo"; // Cambiar texto del botón
    startButton.style.display = 'block'; // Mostrar botón para reiniciar
    touchControlsDiv.style.display = 'none'; // Ocultar controles táctiles
    instructionsDiv.style.display = 'block'; // Mostrar instrucciones de nuevo
}

// --- Inicialización ---
startButton.addEventListener('click', startGame); // El botón inicia el juego

// Función para dibujar la pantalla inicial antes de empezar
function showInitialScreen() {
    // Asegurarse que el juego no esté corriendo y detener cualquier bucle
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);

    // Dibujar fondo negro o imagen de fondo
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
    // Dibujar cuadro de texto semitransparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.4);
    // Dibujar textos
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDES INFINITO', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('¡Prepara tus láseres!', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Pulsa "Iniciar Juego"', canvas.width / 2, canvas.height / 2 + 40);

    // Asegurar estado correcto de la UI
    instructionsDiv.style.display = 'block'; // Mostrar instrucciones
    touchControlsDiv.style.display = 'none'; // Ocultar controles táctiles
    startButton.textContent = "Iniciar Juego"; // Texto inicial del botón
    startButton.style.display = 'block'; // Mostrar botón de inicio
}

// Esperar a que carguen las imágenes esenciales y mostrar pantalla inicial
let initialLoadCheck = setInterval(() => {
    // Esperar al menos fondo y jugador para mostrar algo
    if (imagesLoadedCount >= 2) {
        clearInterval(initialLoadCheck);
        showInitialScreen();
    }
}, 100);
// Mostrar pantalla igualmente después de 5 segundos si algo falla
setTimeout(() => {
     clearInterval(initialLoadCheck);
     if (!gameRunning) { // Solo si no ha empezado ya por alguna razón
        showInitialScreen();
     }
}, 5000);