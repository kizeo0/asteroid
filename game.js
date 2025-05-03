const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const startButton = document.getElementById('startButton');
const instructionsDiv = document.getElementById('instructions'); // Referencia a las instrucciones
const touchControlsDiv = document.getElementById('touch-controls'); // Referencia al contenedor de controles

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
const enemyImages = {
    lex: new Image(),
    mau: new Image()
};
enemyImages.lex.src = 'lex.png'; // Asegúrate que esta imagen existe
enemyImages.mau.src = 'mau.png'; // Asegúrate que esta imagen existe
const powerUpImages = {
    fast_shot: new Image(),
    clear_screen: new Image()
};
powerUpImages.fast_shot.src = 'man.png'; // Asegúrate que esta imagen existe (otorga vida)
powerUpImages.clear_screen.src = 'luc.png'; // Asegúrate que esta imagen existe (limpia pantalla)

// Sonidos
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego ---
const PLAYER_SIZE = 120; // Más pequeño para adaptarse mejor a pantalla móvil
const ENEMY_SIZE = 100;  // Más pequeño
const POWERUP_SIZE = 50; // Más pequeño
const LASER_SPEED = 6; // Ligeramente más lento
const PLAYER_TURN_SPEED = 0.09; // Un poco más rápido para compensar controles táctiles
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.4;
const ENEMY_SPEED_MAX = 1.2;
const MAX_SCORE = 1000;
const POINTS_PER_LEVEL = 10;
const POWERUP_CHANCE = 0.0015; // Ligeramente mayor probabilidad
const POWERUP_DURATION = 5000; // ms (5 segundos)
const RARE_POWERUP_CHANCE_MOD = 0.2;
const ENEMY_SPAWN_RATE_INITIAL = 140; // Un poco más rápido al inicio
const ENEMY_SPAWN_RATE_INCREASE = 0.96;
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 2500; // ms (2.5 segundos)

let score = 0;
let level = 1;
let lives = INITIAL_LIVES;
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

let player = {
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
    baseFireRate: 18, // Ligeramente más lento el disparo base
    currentFireRate: 18,
    fireRateBoostTimer: 0, // Este powerup ahora da vidas
    invincible: false,
    invincibilityTimer: 0
};

let lasers = [];
let enemies = [];
let powerUps = [];
let keys = {}; // Estado de las teclas (físicas o virtuales)

// --- Carga de Imágenes (sin cambios) ---
let imagesLoaded = 0;
const totalImages = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length;
function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("Todas las imágenes cargadas.");
        // Habilitar botón o indicar carga completa si es necesario
    } else {
         console.log(`Imagen cargada (${imagesLoaded}/${totalImages})`);
    }
}
playerImg.onerror = () => console.error("Error cargando pla.png");
bgImg.onerror = () => console.error("Error cargando fondo.png");
enemyImages.lex.onerror = () => console.error("Error cargando lex.png");
enemyImages.mau.onerror = () => console.error("Error cargando mau.png");
powerUpImages.fast_shot.onerror = () => console.error("Error cargando man.png");
powerUpImages.clear_screen.onerror = () => console.error("Error cargando luc.png");

playerImg.onload = imageLoaded;
bgImg.onload = imageLoaded;
enemyImages.lex.onload = imageLoaded;
enemyImages.mau.onload = imageLoaded;
powerUpImages.fast_shot.onload = imageLoaded;
powerUpImages.clear_screen.onload = imageLoaded;


// --- Controles de Teclado ---
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevenir scroll solo para teclas usadas en el juego
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- Controles Táctiles ---
function handleTouchStart(e, keyCode) {
    e.preventDefault(); // Prevenir zoom, scroll y eventos de ratón fantasma
    keys[keyCode] = true;
    // Podrías añadir feedback visual aquí si lo deseas (cambiar estilo del botón)
}

function handleTouchEnd(e, keyCode) {
    e.preventDefault();
    keys[keyCode] = false;
    // Quitar feedback visual aquí
}

// Asignar listeners a los botones táctiles
dpadUp.addEventListener('touchstart', (e) => handleTouchStart(e, 'ArrowUp'), { passive: false });
dpadUp.addEventListener('touchend', (e) => handleTouchEnd(e, 'ArrowUp'), { passive: false });
dpadDown.addEventListener('touchstart', (e) => handleTouchStart(e, 'ArrowDown'), { passive: false }); // Mapeado aunque no se use directamente para mover
dpadDown.addEventListener('touchend', (e) => handleTouchEnd(e, 'ArrowDown'), { passive: false });
dpadLeft.addEventListener('touchstart', (e) => handleTouchStart(e, 'ArrowLeft'), { passive: false });
dpadLeft.addEventListener('touchend', (e) => handleTouchEnd(e, 'ArrowLeft'), { passive: false });
dpadRight.addEventListener('touchstart', (e) => handleTouchStart(e, 'ArrowRight'), { passive: false });
dpadRight.addEventListener('touchend', (e) => handleTouchEnd(e, 'ArrowRight'), { passive: false });
shootButton.addEventListener('touchstart', (e) => handleTouchStart(e, 'Space'), { passive: false });
shootButton.addEventListener('touchend', (e) => handleTouchEnd(e, 'Space'), { passive: false });

// Ocultar controles táctiles inicialmente
touchControlsDiv.style.display = 'none';


// --- Funciones del Juego (adaptadas o sin cambios) ---

function playSound(sound) {
    const soundClone = sound.cloneNode();
    soundClone.volume = sound.volume;
    soundClone.play().catch(e => console.warn("Advertencia al reproducir sonido:", e.message)); // Usar warn en lugar de error
}

function wrapAround(obj) {
    // Usar las dimensiones reales del canvas para el wrap around
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    if (obj.x < -obj.width / 2) obj.x = canvasWidth + obj.width / 2;
    if (obj.x > canvasWidth + obj.width / 2) obj.x = -obj.width / 2;
    if (obj.y < -obj.height / 2) obj.y = canvasHeight + obj.height / 2;
    if (obj.y > canvasHeight + obj.height / 2) obj.y = -obj.height / 2;
}

function updatePlayer() {
    // Rotación (lee el estado de 'keys', sea por teclado o táctil)
    if (keys['ArrowLeft']) player.rotation = -PLAYER_TURN_SPEED;
    else if (keys['ArrowRight']) player.rotation = PLAYER_TURN_SPEED;
    else player.rotation = 0;
    player.angle += player.rotation;

    // Empuje
    player.thrusting = keys['ArrowUp'];
    if (player.thrusting) {
        player.vx += Math.cos(player.angle) * PLAYER_THRUST;
        player.vy += Math.sin(player.angle) * PLAYER_THRUST;
    }

    // Fricción
    player.vx *= FRICTION;
    player.vy *= FRICTION;

    // Mover
    player.x += player.vx;
    player.y += player.vy;

    // Wrap
    wrapAround(player);

    // Disparo
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    if (keys['Space'] && player.shootCooldown <= 0) {
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }

    // Timer del power-up (Ahora da vidas, así que no hay timer de disparo rápido)
    /*
    if (player.fireRateBoostTimer > 0) {
        player.fireRateBoostTimer -= 1000 / 60; // Aproximado ms por frame
        if (player.fireRateBoostTimer <= 0) {
            player.currentFireRate = player.baseFireRate;
            console.log("Fire rate boost ended");
        }
    }
    */

    // Timer de invulnerabilidad
    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60;
        if (player.invincibilityTimer <= 0) {
            player.invincible = false;
            // console.log("Invincibility ended"); // Opcional: quitar log
        }
    }
}

function shootLaser() {
    const laserOriginDist = player.width / 2; // Desde el centro hacia la punta
    const laserX = player.x + Math.cos(player.angle) * laserOriginDist;
    const laserY = player.y + Math.sin(player.angle) * laserOriginDist;

    const laser = {
        x: laserX,
        y: laserY,
        vx: Math.cos(player.angle) * LASER_SPEED + player.vx * 0.4, // Añade menos velocidad de la nave
        vy: Math.sin(player.angle) * LASER_SPEED + player.vy * 0.4,
        width: 3,
        height: 8,
        angle: player.angle
    };
    lasers.push(laser);
    playSound(shotSound);
}
function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.x += laser.vx;
        laser.y += laser.vy;

        // Eliminar si sale de la pantalla (usar dimensiones del canvas)
        if (laser.x < 0 || laser.x > canvas.width || laser.y < 0 || laser.y > canvas.height) {
            lasers.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    if (edge === 0) { // Top
        x = Math.random() * canvasWidth;
        y = -ENEMY_SIZE / 2;
    } else if (edge === 1) { // Right
        x = canvasWidth + ENEMY_SIZE / 2;
        y = Math.random() * canvasHeight;
    } else if (edge === 2) { // Bottom
        x = Math.random() * canvasWidth;
        y = canvasHeight + ENEMY_SIZE / 2;
    } else { // Left
        x = -ENEMY_SIZE / 2;
        y = Math.random() * canvasHeight;
    }

    // Apuntar hacia el centro del canvas (aproximado) para más desafío inicial
    const angleToCenter = Math.atan2(canvasHeight / 2 - y, canvasWidth / 2 - x);
    // Añadir pequeña variación aleatoria al ángulo
    const angleVariation = (Math.random() - 0.5) * (Math.PI / 2); // +/- 45 grados
    const angle = angleToCenter + angleVariation;

    const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.08); // Ajustar incremento de velocidad

    enemies.push({
        x: x,
        y: y,
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: type,
        image: enemyImages[type]
    });
}

function updateEnemies() {
    enemySpawnCounter++;
    if (enemySpawnCounter >= enemySpawnRate && enemies.length < 15 + level * 2) { // Limitar número de enemigos
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
    const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot'; // fast_shot da vida
    powerUps.push({
        x: Math.random() * (canvas.width - POWERUP_SIZE),
        y: Math.random() * (canvas.height - POWERUP_SIZE),
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        type: type,
        image: powerUpImages[type],
        creationTime: Date.now(),
        duration: 8000 // Duración un poco menor
    });
}

function updatePowerUps() {
    if (Math.random() < POWERUP_CHANCE && powerUps.length < 2) {
        spawnPowerUp();
    }
    const now = Date.now();
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        if (now - pu.creationTime > pu.duration) {
            powerUps.splice(i, 1);
        }
    }
}


function checkCollisions() {
    // Lasers vs Enemies
    for (let i = lasers.length - 1; i >= 0; i--) {
        if (!lasers[i]) continue; // Seguridad por si algo falla
        const laser = lasers[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
             if (!enemies[j]) continue;
            const enemy = enemies[j];
            const dx = laser.x - enemy.x;
            const dy = laser.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Colisión círculo-círculo aproximada
            if (distance < (laser.height / 2 + enemy.width / 2) * 0.85) { // Ajustar radio efectivo
                lasers.splice(i, 1);
                enemies.splice(j, 1); // Eliminar enemigo
                playSound(killSound);
                score++;
                updateScoreAndLevel();
                break; // El láser desaparece después de golpear
            }
        }
    }

    // Player vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        const dx = player.x - (pu.x + pu.width / 2);
        const dy = player.y - (pu.y + pu.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (player.width / 2 + pu.width / 2) * 0.9) { // Ajustar radio
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

            if (distance < (player.width / 2 + enemy.width / 2) * 0.75) { // Ajustar radio de colisión
                 hitPlayer();
                 // Opcional: Destruir también al enemigo al chocar con el jugador
                 // enemies.splice(i, 1);
                 // playSound(killSound); // Sonido de destrucción
                 break; // El jugador solo puede ser golpeado una vez por frame
            }
        }
    }
}

function hitPlayer() {
    lives--;
    updateScoreAndLevel();

    if (lives <= 0) {
        gameOver("¡HAS PERDIDO!");
    } else {
        // Resetear jugador y dar invulnerabilidad
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.vx = 0;
        player.vy = 0;
        player.angle = -Math.PI / 2;
        player.invincible = true;
        player.invincibilityTimer = INVINCIBILITY_DURATION;
        console.log(`Golpe! Vidas restantes: ${lives}`);
        // Podrías añadir sonido de golpe al jugador
    }
}

function applyPowerUp(type) {
    if (type === 'fast_shot') { // Ahora 'man.png' da vida
        lives++;
        const maxLives = INITIAL_LIVES + 2; // Límite 5 vidas
        if (lives > maxLives) {
             lives = maxLives;
        }
        updateScoreAndLevel();
        console.log("¡Vida extra!");
        // playSound(lifeSound); // Si tuvieras sonido de vida

    } else if (type === 'clear_screen') { // 'luc.png' limpia pantalla
        score += enemies.length; // Puntos por enemigos eliminados
        enemies = [];
        playSound(killSound); // O sonido especial
        updateScoreAndLevel();
        console.log("¡Pantalla despejada!");
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
        enemySpawnRate *= ENEMY_SPAWN_RATE_INCREASE; // Spawnean más rápido
        // Limitar qué tan rápido puede ser el spawn rate
        if (enemySpawnRate < 30) enemySpawnRate = 30; // Mínimo ~0.5 segundos entre spawns
        console.log(`Nivel ${level}! Spawn Rate: ${enemySpawnRate.toFixed(1)} frames`);
    }

    // No hay condición de victoria por puntaje máximo en este modo infinito
}

function drawPlayer() {
    let draw = true;
    if (player.invincible) {
        // Parpadeo más rápido
        const blinkRate = 100; // ms
        draw = (Date.now() % (blinkRate * 2)) < blinkRate;
    }

    if (draw) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle + Math.PI / 2); // Rotar imagen para que apunte "arriba"
        ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
        ctx.restore();

        // Dibujar propulsor si está activo (ajustado a la nueva rotación)
        if (player.thrusting) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.angle); // Rotación original para la dirección
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            // Triángulo detrás del jugador
            const rearX = -player.width / 2; // Parte trasera de la nave (considerando rotación de imagen)
            ctx.moveTo(rearX - 2, 5);  // Esquina inferior izquierda
            ctx.lineTo(rearX - 10, 0); // Punta trasera
            ctx.lineTo(rearX - 2, -5); // Esquina superior izquierda
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
}

function drawLasers() {
    ctx.fillStyle = 'red';
    for (const laser of lasers) {
        ctx.save();
        ctx.translate(laser.x, laser.y);
        ctx.rotate(laser.angle); // Rotar el láser
        // Dibujar rectángulo simple alineado con la dirección
        ctx.fillRect(-laser.width / 2, -laser.height / 2, laser.width, laser.height);
        ctx.restore();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
         // Opcional: Rotar enemigos ligeramente para variedad
         // ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2);
        ctx.drawImage(enemy.image, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.restore();
    }
}

function drawPowerUps() {
    for (const pu of powerUps) {
        // Podría añadir un efecto visual (pulsar tamaño o transparencia)
        const pulse = Math.sin(Date.now() * 0.005) * 2 + 1; // Pequeño factor de escala
        const w = pu.width + pulse;
        const h = pu.height + pulse;
        ctx.drawImage(pu.image, pu.x - (w - pu.width)/2, pu.y - (h - pu.height)/2, w, h);
        //ctx.drawImage(pu.image, pu.x, pu.y, pu.width, pu.height);
    }
}

function gameLoop() {
    if (!gameRunning) return;

    // Limpiar Canvas
    // ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar si no hay fondo
    // Dibujar Fondo (cubre el frame anterior)
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // Actualizar Estado
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();

    // Comprobar Colisiones
    checkCollisions();

    // Dibujar Elementos
    drawEnemies(); // Dibujar enemigos debajo del jugador
    drawPowerUps();
    drawLasers();
    drawPlayer(); // Jugador encima de casi todo

    // Solicitar Siguiente Frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    if (gameRunning) return;

    // Resetear estado
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        angle: -Math.PI / 2,
        vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18,
        fireRateBoostTimer: 0,
        invincible: true, // Invulnerable al empezar/reiniciar
        invincibilityTimer: INVINCIBILITY_DURATION
    };
    lasers = [];
    enemies = [];
    powerUps = [];
    keys = {}; // Limpiar estado de teclas
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

    updateScoreAndLevel();

    gameRunning = true;
    startButton.style.display = 'none'; // Ocultar botón de inicio
    instructionsDiv.style.display = 'none'; // Ocultar instrucciones durante el juego
    touchControlsDiv.style.display = 'flex'; // Mostrar controles táctiles

    // Iniciar música
    bgMusic.volume = 0.2; // Volumen más bajo
    bgMusic.currentTime = 0; // Asegurar que empieza desde el principio
    bgMusic.play().catch(e => console.log("Interacción necesaria para reproducir música."));

    gameLoop();
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();

    // Mostrar mensaje de Game Over
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial"; // Ajustar tamaño
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = "20px Arial";
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);

    startButton.textContent = "Jugar de Nuevo";
    startButton.style.display = 'block';
    touchControlsDiv.style.display = 'none'; // Ocultar controles táctiles
    instructionsDiv.style.display = 'block'; // Mostrar instrucciones de nuevo
}

// --- Inicio del Juego ---
startButton.addEventListener('click', startGame);

// Estado inicial (antes de hacer clic en Start)
function showInitialScreen() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
     // Dibujar imagen de fondo si ya cargó
    if (bgImg.complete && bgImg.naturalWidth !== 0) {
         ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Fondo semitransparente para texto
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.4);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDES INFINITO', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('¡Prepara tus láseres!', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Pulsa "Iniciar Juego"', canvas.width / 2, canvas.height / 2 + 40);
    instructionsDiv.style.display = 'block'; // Mostrar instrucciones al inicio
    touchControlsDiv.style.display = 'none'; // Ocultar controles táctiles al inicio
}

// Mostrar pantalla inicial cuando las imágenes base estén listas (o después de un tiempo)
let loadCheckInterval = setInterval(() => {
     // Esperar al menos al fondo y jugador
    if (playerImg.complete && bgImg.complete) {
        clearInterval(loadCheckInterval);
        showInitialScreen();
    }
}, 100);
// Si después de 5 segundos no carga, muestra igual
setTimeout(() => {
     clearInterval(loadCheckInterval);
     showInitialScreen(); // Muestra incluso si algo falló
}, 5000);
