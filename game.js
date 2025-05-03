const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives'); // Añadido para mostrar vidas
const startButton = document.getElementById('startButton');

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
    fast_shot: new Image(),
    clear_screen: new Image()
};
powerUpImages.fast_shot.src = 'man.png';
powerUpImages.clear_screen.src = 'luc.png';

// Sonidos
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');

// --- Configuración del Juego ---
const PLAYER_SIZE = 120; // Ajustado: Aumenta el tamaño del jugador
const ENEMY_SIZE = 70;  // Ajustado: Aumenta el tamaño de los enemigos
const POWERUP_SIZE = 45; // Ajustado: Aumenta el tamaño de los power-ups
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
let keys = {};

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
powerUpImages.fast_shot.onload = imageLoaded;
powerUpImages.clear_screen.onload = imageLoaded;

// --- Controles ---
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Evitar que la página haga scroll con las flechas/espacio
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- Funciones del Juego ---

function playSound(sound) {
    // Clona el nodo para permitir reproducciones superpuestas rápidas
    const soundClone = sound.cloneNode();
    soundClone.volume = sound.volume; // Mantener el volumen original si se ajusta
    soundClone.play().catch(e => console.error("Error al reproducir sonido:", e));
}

function wrapAround(obj) {
    if (obj.x < -obj.width / 2) obj.x = canvas.width + obj.width / 2;
    if (obj.x > canvas.width + obj.width / 2) obj.x = -obj.width / 2;
    if (obj.y < -obj.height / 2) obj.y = canvas.height + obj.height / 2;
    if (obj.y > canvas.height + obj.height / 2) obj.y = -obj.height / 2;
}

function updatePlayer() {
    // Rotación
    if (keys['ArrowLeft']) player.rotation = -PLAYER_TURN_SPEED;
    else if (keys['ArrowRight']) player.rotation = PLAYER_TURN_SPEED;
    else player.rotation = 0;
    player.angle += player.rotation;

    // Empuje (Thrust)
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

    // Disparo
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

function shootLaser() {
    // Calcular punto de origen (punta de la nave)
    // Asumimos que la punta está en el centro frontal de la imagen
    // Ajuste: Usar player.width / 2 si la "punta" de la imagen pla.png
    // está a lo largo del eje horizontal del sprite (antes de la rotación del juego).
    // Si la punta está a lo largo del eje vertical (arriba/abajo) del sprite,
    // player.height / 2 era correcto.
    // Si el disparo sale por los lados, probar con player.width / 2.
    const laserOriginDist = player.width / 2; // <-- POSIBLE CAMBIO AQUÍ (antes era player.height / 2)
    const laserX = player.x + Math.cos(player.angle) * laserOriginDist;
    const laserY = player.y + Math.sin(player.angle) * laserOriginDist;

    const laser = {
        x: laserX,
        y: laserY,
        vx: Math.cos(player.angle) * LASER_SPEED + player.vx * 0.5, // Añadir algo de velocidad de la nave
        vy: Math.sin(player.angle) * LASER_SPEED + player.vy * 0.5,
        width: 4, // Ancho del láser
        height: 10, // Largo del láser (se ajustará con rotación)
        angle: player.angle // Para dibujar rotado
    };
    lasers.push(laser);
    playSound(shotSound);
}
function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.x += laser.vx;
        laser.y += laser.vy;

        // Eliminar si sale de la pantalla
        if (laser.x < 0 || laser.x > canvas.width || laser.y < 0 || laser.y > canvas.height) {
            lasers.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y;

    if (edge === 0) { // Top
        x = Math.random() * canvas.width;
        y = -ENEMY_SIZE / 2;
    } else if (edge === 1) { // Right
        x = canvas.width + ENEMY_SIZE / 2;
        y = Math.random() * canvas.height;
    } else if (edge === 2) { // Bottom
        x = Math.random() * canvas.width;
        y = canvas.height + ENEMY_SIZE / 2;
    } else { // Left
        x = -ENEMY_SIZE / 2;
        y = Math.random() * canvas.height;
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.1); // Aumenta velocidad con nivel

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
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        type: type,
        image: powerUpImages[type],
        creationTime: Date.now(),
        duration: 10000 // Desaparece después de 10 segundos si no se recoge
    });
}

function updatePowerUps() {
    // Spawn aleatorio
    if (Math.random() < POWERUP_CHANCE && powerUps.length < 2) { // Limitar a 2 powerups en pantalla
        spawnPowerUp();
    }

    // Actualizar y eliminar los viejos
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
        const laser = lasers[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];

            // Detección de colisión simple (rectángulos)
            // Se podría mejorar con círculos si las imágenes son redondas
            const dx = laser.x - enemy.x;
            const dy = laser.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Comprobar colisión (simplificado con radios promedio)
            if (distance < (laser.width + enemy.width) / 2.5) { // Ajustar divisor para mejor feel
                lasers.splice(i, 1);
                enemies.splice(j, j + 1); // Eliminar solo el enemigo actual
                playSound(killSound);
                score++;
                updateScoreAndLevel();
                break; // El láser solo puede golpear a un enemigo
            }
        }
    }

    // Player vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        const dx = player.x - (pu.x + pu.width / 2); // Centro del powerup
        const dy = player.y - (pu.y + pu.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (player.width + pu.width) / 3) { // Ajustar divisor
            applyPowerUp(pu.type);
            powerUps.splice(i, 1);
            // Podrías añadir un sonido de power-up aquí
        }
    }

    // Player vs Enemies (Añadido: Detección de colisión del jugador)
    if (!player.invincible) { // Solo verifica colisión si el jugador no es invulnerable
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Comprobar colisión (ajustar divisor para mejor feel)
            if (distance < (player.width / 2 + enemy.width / 2) * 0.7) { // Reducir el radio de colisión un poco
                 hitPlayer(); // Llama a la función cuando el jugador es golpeado
                 break; // Solo necesita ser golpeado por un enemigo a la vez
            }
        }
    }
}

// Añadido: Función para manejar cuando el jugador es golpeado
function hitPlayer() {
    lives--;
    updateScoreAndLevel(); // Actualiza el display de vidas

    if (lives <= 0) {
        gameOver("¡Has Perdido!");
    } else {
        // Reiniciar posición del jugador y dar invulnerabilidad temporal
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.vx = 0;
        player.vy = 0;
        player.angle = -Math.PI / 2;
        player.invincible = true;
        player.invincibilityTimer = 3000; // 3 segundos de invulnerabilidad
        // Podrías añadir un efecto visual (parpadeo) para indicar invulnerabilidad
        console.log(`Player hit! Lives remaining: ${lives}`);
    }
}


function applyPowerUp(type) {
    // El power-up man.png está asociado con el tipo 'fast_shot' en tu código actual.
    // Cambiamos la lógica para que el tipo 'fast_shot' ahora dé una vida.
    if (type === 'fast_shot') { // Si el power-up es el que usa man.png ('fast_shot')
        lives++; // Aumenta el número de vidas

        // Opcional: Poner un límite máximo de vidas (ej: no más de 5)
        const maxLives = INITIAL_LIVES + 2; // Límite de vidas = Vidas iniciales + 2 (ej: 3 + 2 = 5)
        if (lives > maxLives) {
             lives = maxLives;
        }
        // Fin Opcional

        updateScoreAndLevel(); // Actualiza el display de vidas en la interfaz
        console.log("¡Vida extra obtenida!");
        // Puedes añadir aquí la reproducción de un sonido de vida extra si tienes uno
        // playSound(lifeSound); // Necesitarías cargar un sonido 'lifeSound'

    } else if (type === 'clear_screen') { // La lógica para luc.png (clear_screen)
        // Dar puntos por enemigos eliminados
        score += enemies.length;
        enemies = []; // Elimina todos los enemigos
        playSound(killSound); // O un sonido diferente para limpiar la pantalla
        updateScoreAndLevel();
        console.log("¡Pantalla despejada!");
    }
    // Elimina aquí la lógica antigua de 'fast_shot' si ya no la quieres (la hemos reemplazado arriba)
    // La lógica antigua era:
    // player.currentFireRate = player.baseFireRate / 2;
    // player.fireRateBoostTimer = POWERUP_DURATION;

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
        enemySpawnRate *= ENEMY_SPAWN_RATE_INCREASE; // Hace que spawneen más rápido
        // Podrías aumentar ENEMY_SPEED_MAX también
        console.log(`Level Up! New Spawn Rate Factor: ${enemySpawnRate}`);
    }

    if (score >= MAX_SCORE && gameRunning) {
         // Podrías mostrar un mensaje de "Puntaje Máximo Alcanzado!"
         // O simplemente dejar que siga jugando, ya que pediste infinito.
         console.log("Puntaje máximo (1000) alcanzado o superado!");
         // Para detener el juego: gameOver("¡Puntaje Máximo!");
    }
}

function drawPlayer() {
     // Añadido: Efecto de parpadeo si es invulnerable
    if (player.invincible) {
        const blinkRate = 150; // ms
        const isVisible = (Date.now() % blinkRate * 2) < blinkRate;
        if (!isVisible) {
            return; // No dibujar si está parpadeando 'apagado'
        }
    }

    ctx.save(); // Guarda el estado actual del contexto (posición, rotación)
    ctx.translate(player.x, player.y); // Mueve el origen al centro de la nave
    ctx.rotate(player.angle); // Rota el contexto
    // Dibuja la imagen centrada en el nuevo origen
    ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);

    // Opcional: Dibuja el propulsor si está activo
    if (player.thrusting) {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        // Triángulo simple para el propulsor detrás de la nave
        ctx.moveTo(-player.width / 2 - 5, 0); // Punto base izquierdo
        ctx.lineTo(-player.width / 2 - 15, 5); // Punto trasero
        ctx.lineTo(-player.width / 2 - 15, -5); // Punto trasero
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore(); // Restaura el estado previo del contexto
}


function drawLasers() {
    for (const laser of lasers) {
        ctx.save();
        ctx.translate(laser.x, laser.y);
        ctx.rotate(laser.angle + Math.PI / 2); // Rota para que el rectángulo apunte correctamente
        ctx.fillStyle = 'red';
        // Dibuja el rectángulo centrado en su posición local (0,0) después de trasladar/rotar
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
    if (gameRunning) return; // Evitar iniciar múltiples veces

    // Resetear estado del juego
    score = 0;
    level = 1;
    lives = INITIAL_LIVES; // Añadido: Resetear vidas al inicio
    player = { // Resetear posición, velocidad, etc.
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
        invincible: true, // Añadido: Invulnerabilidad al inicio del juego
        invincibilityTimer: 3000 // Añadido: Duración de la invulnerabilidad inicial
    };
    lasers = [];
    enemies = [];
    powerUps = [];
    keys = {};
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

    updateScoreAndLevel(); // Pone los displays a 0/1/3

    gameRunning = true;
    startButton.style.display = 'none'; // Ocultar botón de inicio
    document.getElementById('instructions').style.display = 'block'; // Mostrar instrucciones

    // Iniciar música de fondo (requiere interacción del usuario previa)
    bgMusic.volume = 0.3; // Volumen bajo para no molestar
    bgMusic.play().catch(e => console.log("El navegador bloqueó la reproducción automática de música. Se necesita interacción."));

    // Iniciar el bucle
    gameLoop();
}

function gameOver(message = "¡Has Perdido!") {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bgMusic.currentTime = 0; // Reiniciar música para la próxima vez

    // Mostrar mensaje de Game Over (puedes hacerlo más elegante)
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "20px Arial";
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 30);

    startButton.textContent = "Jugar de Nuevo"; // Cambiar texto del botón
    startButton.style.display = 'block'; // Mostrar botón para reiniciar
    document.getElementById('instructions').style.display = 'none'; // Ocultar instrucciones
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
document.getElementById('instructions').style.display = 'none'; // Ocultar instrucciones al inicio

// Controles táctiles con pad fuera del canvas
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn'); // si deseas usar ↓ en el futuro
const fireBtn = document.getElementById('fireBtn');

if (leftBtn && rightBtn && upBtn && fireBtn) {
    const simulateKey = (keyCode, type) => {
        const event = new KeyboardEvent(type, { keyCode: keyCode, which: keyCode });
        document.dispatchEvent(event);
    };

    leftBtn.addEventListener('touchstart', () => simulateKey(37, 'keydown'));
    leftBtn.addEventListener('touchend', () => simulateKey(37, 'keyup'));

    rightBtn.addEventListener('touchstart', () => simulateKey(39, 'keydown'));
    rightBtn.addEventListener('touchend', () => simulateKey(39, 'keyup'));

    upBtn.addEventListener('touchstart', () => simulateKey(38, 'keydown'));
    upBtn.addEventListener('touchend', () => simulateKey(38, 'keyup'));

    fireBtn.addEventListener('touchstart', () => simulateKey(32, 'keydown'));
    fireBtn.addEventListener('touchend', () => simulateKey(32, 'keyup'));

    if (downBtn) {
        downBtn.addEventListener('touchstart', () => simulateKey(40, 'keydown'));
        downBtn.addEventListener('touchend', () => simulateKey(40, 'keyup'));
    }
}
