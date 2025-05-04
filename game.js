// ========================================================================= //
//                                                                           //
//       CONTENIDO COMPLETO DE game.js (Logica Jefe v2 + Barra Vida Fija)    //
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
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const shootButton = document.getElementById('shoot-button');

// --- Recursos ---
const playerImg = new Image(); playerImg.src = 'pla.png';
const bgImg = new Image(); bgImg.src = 'fondo.png';
const enemyImages = { lex: new Image(), mau: new Image() };
enemyImages.lex.src = 'lex.png'; enemyImages.mau.src = 'mau.png';
const powerUpImages = { fast_shot: new Image(), clear_screen: new Image() };
powerUpImages.fast_shot.src = 'man.png'; // Vida extra
powerUpImages.clear_screen.src = 'luc.png'; // Limpiar pantalla
const bossImg = new Image(); bossImg.src = 'momo.png';

// Sonidos (IDs deben coincidir con el HTML)
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');
const momoSound1 = document.getElementById('momoSound1');
const momoSound2 = document.getElementById('momoSound2');
const bossMusic = document.getElementById('bossMusic');

// --- Configuración del Juego ---
const PLAYER_SIZE = 80;
const ENEMY_SIZE = 70;
const POWERUP_SIZE = 60;
const LASER_SPEED = 6;
const PLAYER_TURN_SPEED = 0.09;
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.4;
const ENEMY_SPEED_MAX = 1.2;
const POINTS_PER_ENEMY = 1;
const POWERUP_CHANCE = 0.0015; // Probabilidad de powerup por frame
const POWERUP_DURATION = 8000; // ms
const RARE_POWERUP_CHANCE_MOD = 0.4; // 40% chance de que un powerup sea "clear_screen" en vez de "fast_shot" (vida)
const ENEMY_SPAWN_RATE_INITIAL = 140; // Frames entre spawns iniciales
const ENEMY_SPAWN_RATE_INCREASE = 0.96; // Multiplicador (reduce tiempo entre spawns)
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 3500; // ms

// --- Configuración del Jefe ---
const BOSS_BASE_SIZE = 160;
const BOSS_BASE_HEALTH = 15;
const BOSS_LASER_SPEED = 4.5;
const BOSS_SHOOT_INTERVAL_BASE = 150; // Frames entre disparos base
const BOSS_SOUND_INTERVAL = 240; // Frames entre sonidos del jefe
const BOSS_POINTS_DEFEAT_BASE = 100; // Puntos base por derrotar jefe
const BOSS_KILL_THRESHOLD = 10; // Enemigos a matar para que aparezca el jefe

// --- Variables de Estado del Juego ---
let score = 0;
let level = 1; // Nivel visual/dificultad
let lives = INITIAL_LIVES;
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
let enemyKillCount = 0; // Contador de enemigos normales eliminados

let player = {
    x: canvas.width / 2, y: canvas.height / 2,
    width: PLAYER_SIZE, height: PLAYER_SIZE,
    angle: -Math.PI / 2, // Apuntar hacia arriba
    vx: 0, vy: 0, // Velocidad
    rotation: 0, // Velocidad de giro
    thrusting: false, // Si está acelerando
    shootCooldown: 0, baseFireRate: 18, // Frames entre disparos
    currentFireRate: 18,
    fireRateBoostTimer: 0, // (No implementado activamente en este powerup)
    invincible: false, // Si es invencible
    invincibilityTimer: 0 // Tiempo restante de invencibilidad
};

let lasers = []; // Disparos del jugador
let enemies = []; // Enemigos normales
let powerUps = []; // Power-ups en pantalla
let keys = {}; // Teclas presionadas

// --- Variables del Jefe ---
let boss = null; // Objeto del jefe (null si no está activo)
let bossLasers = []; // Disparos del jefe

// --- Carga de Imágenes ---
let imagesLoadedCount = 0;
const totalImagesToLoad = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length + 1; // player, bg, enemies, powerups, boss

function imageLoaded() {
    imagesLoadedCount++;
    console.log(`Imagen cargada (${imagesLoadedCount}/${totalImagesToLoad})`);
    if (imagesLoadedCount === totalImagesToLoad) {
        console.log("Todas las imágenes cargadas.");
        // Ya no se inicia el juego aquí, se espera al botón o al fallback
    }
}

// Asignar manejador onload/onerror a todas las imágenes
[playerImg, bgImg, enemyImages.lex, enemyImages.mau, powerUpImages.fast_shot, powerUpImages.clear_screen, bossImg].forEach(img => {
    img.onload = imageLoaded;
    img.onerror = () => console.error(`Error cargando ${img.src}`);
    // Si la imagen ya está en caché, forzar llamada a onload
    if (img.complete && img.naturalWidth > 0) {
        imageLoaded();
    }
});


// --- Controles (Teclado y Táctil) ---
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevenir scroll con flechas y espacio
    if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
    // Solo poner en false si realmente estaba en true (evita problemas con repetición de teclas)
    if (keys[e.code] === true) {
         keys[e.code] = false;
    }
});

function handleTouchStart(e, keyCode) {
    e.preventDefault(); // Prevenir comportamiento táctil por defecto (scroll, zoom)
    keys[keyCode] = true;
}
function handleTouchEnd(e, keyCode) {
    e.preventDefault();
    keys[keyCode] = false;
}

// Asignar eventos táctiles y de mouse a los botones en pantalla
[{el: dpadUp, key: 'ArrowUp'}, {el: dpadLeft, key: 'ArrowLeft'}, {el: dpadRight, key: 'ArrowRight'}, {el: shootButton, key: 'Space'}].forEach(item => {
    // Touch events
    item.el.addEventListener('touchstart', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('touchend', (e) => handleTouchEnd(e, item.key), { passive: false });
    // Mouse events (for testing on desktop and fallback)
    item.el.addEventListener('mousedown', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('mouseup', (e) => handleTouchEnd(e, item.key), { passive: false });
    // Handle cases where touch is cancelled (e.g., sliding off the button)
    item.el.addEventListener('touchcancel', (e) => handleTouchEnd(e, item.key), { passive: false });
});


// --- Funciones del Juego ---

function playSound(sound) {
    if (!sound) {
        console.warn("Intento de reproducir sonido nulo.");
        return;
    }
    // Clonar el nodo de audio para permitir múltiples reproducciones simultáneas
    const clone = sound.cloneNode();
    clone.volume = sound.volume || 0.5; // Usar volumen base si está definido, sino 0.5
    // Intentar reproducir y capturar errores (ej. por interacción del usuario no detectada)
    clone.play().catch(e => {
        const soundId = sound.id || 'desconocido';
        // Mostrar advertencia en lugar de error para no detener el juego
        console.warn(`Advertencia sonido (${soundId}): ${e.message}`);
    });
}

// Hace que un objeto reaparezca en el lado opuesto si sale de la pantalla
function wrapAround(obj) {
    const w = canvas.width, h = canvas.height;
    const hw = obj.width / 2, hh = obj.height / 2; // Half width/height

    if (obj.x < -hw) obj.x = w + hw; // Salió por la izquierda -> aparece en la derecha
    if (obj.x > w + hw) obj.x = -hw; // Salió por la derecha -> aparece en la izquierda
    if (obj.y < -hh) obj.y = h + hh; // Salió por arriba -> aparece abajo
    if (obj.y > h + hh) obj.y = -hh; // Salió por abajo -> aparece arriba
}

function updatePlayer() {
    // Rotación basada en teclas Izquierda/Derecha
    player.rotation = keys['ArrowLeft'] ? -PLAYER_TURN_SPEED : (keys['ArrowRight'] ? PLAYER_TURN_SPEED : 0);
    player.angle += player.rotation;

    // Empuje basado en tecla Arriba
    player.thrusting = keys['ArrowUp'];
    if (player.thrusting) {
        // Acelerar en la dirección del ángulo
        player.vx += Math.cos(player.angle) * PLAYER_THRUST;
        player.vy += Math.sin(player.angle) * PLAYER_THRUST;
    }

    // Aplicar fricción para detener la nave gradualmente
    player.vx *= FRICTION;
    player.vy *= FRICTION;

    // Actualizar posición
    player.x += player.vx;
    player.y += player.vy;

    // Comprobar si sale de la pantalla
    wrapAround(player);

    // Manejar cooldown de disparo
    if (player.shootCooldown > 0) player.shootCooldown--;

    // Disparar si la tecla Espacio está presionada y el cooldown es 0
    if (keys['Space'] && player.shootCooldown <= 0 && !player.invincible) {
        shootLaser();
        player.shootCooldown = player.currentFireRate; // Reiniciar cooldown
    }

    // Manejar invencibilidad
    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60; // Restar tiempo (asumiendo 60 FPS)
        if (player.invincibilityTimer <= 0) {
            player.invincible = false;
            console.log("Invencibilidad terminada.");
        }
    }
}

function shootLaser() {
    const angle = player.angle;
    // Calcular punto de origen del láser (punta de la nave)
    const originDist = player.width / 2;
    const startX = player.x + Math.cos(angle) * originDist;
    const startY = player.y + Math.sin(angle) * originDist;

    // Crear láser con velocidad base + parte de la velocidad del jugador
    lasers.push({
        x: startX, y: startY,
        angle: angle,
        vx: Math.cos(angle) * LASER_SPEED + player.vx * 0.4,
        vy: Math.sin(angle) * LASER_SPEED + player.vy * 0.4,
        width: 5, height: 10 // Tamaño del láser
    });
    playSound(shotSound);
}

function updateLasers() {
    // Mover cada láser y eliminar los que salen de pantalla
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.x += l.vx;
        l.y += l.vy;

        // Eliminar si está fuera del canvas
        if (l.x < 0 || l.x > canvas.width || l.y < 0 || l.y > canvas.height) {
            lasers.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    // No generar enemigos si el jefe está activo
    if (boss && boss.state !== 'leaving') return;

    // Elegir tipo de enemigo (lex o mau)
    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    // Elegir borde por el que aparecerá (0=arriba, 1=derecha, 2=abajo, 3=izquierda)
    const edge = Math.floor(Math.random() * 4);
    const w = canvas.width, h = canvas.height;
    const margin = ENEMY_SIZE * 1.5; // Margen fuera de pantalla
    let x, y;

    // Calcular posición inicial fuera de la pantalla
    if (edge === 0)      { x = Math.random() * w; y = -margin; }         // Arriba
    else if (edge === 1) { x = w + margin;        y = Math.random() * h; } // Derecha
    else if (edge === 2) { x = Math.random() * w; y = h + margin; }        // Abajo
    else                 { x = -margin;           y = Math.random() * h; } // Izquierda

    // Calcular ángulo hacia el centro +/- una variación aleatoria
    const angleToCenter = Math.atan2(h / 2 - y, w / 2 - x);
    const angleVariation = (Math.random() - 0.5) * (Math.PI / 2); // Variación de +/- 45 grados
    const angle = angleToCenter + angleVariation;

    // Calcular velocidad (base + aleatorio + bonus por nivel)
    const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.08);

    // Crear enemigo
    enemies.push({
        x: x, y: y,
        width: ENEMY_SIZE, height: ENEMY_SIZE,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: type,
        image: enemyImages[type]
    });
}

function updateEnemies() {
    // Generar nuevos enemigos si no está el jefe
    if (!boss || boss.state === 'leaving') {
        enemySpawnCounter++;
        const maxEnemies = 10 + level; // Límite de enemigos en pantalla
        if (enemySpawnCounter >= enemySpawnRate && enemies.length < maxEnemies) {
            spawnEnemy();
            enemySpawnCounter = 0; // Reiniciar contador de spawn
        }
    }

    // Mover enemigos y aplicar wrapAround
    enemies.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        wrapAround(e);
    });
}

function spawnPowerUp() {
    // Generar en posición aleatoria dentro del canvas (con padding)
    const padding = POWERUP_SIZE * 1.5;
    const x = padding + Math.random() * (canvas.width - 2 * padding);
    const y = padding + Math.random() * (canvas.height - 2 * padding);

    // Decidir tipo (más probable vida extra, menos probable limpiar pantalla)
    const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot';

    powerUps.push({
        x: x, y: y,
        width: POWERUP_SIZE, height: POWERUP_SIZE,
        type: type, image: powerUpImages[type],
        creationTime: Date.now() // Para controlar duración
    });
}

function updatePowerUps() {
    // Probabilidad de generar un powerup si no está el jefe
    if (!boss && Math.random() < POWERUP_CHANCE && powerUps.length < 3) { // Máximo 3 powerups
        spawnPowerUp();
    }

    // Eliminar powerups que expiraron
    const now = Date.now();
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (now - powerUps[i].creationTime > POWERUP_DURATION) {
            powerUps.splice(i, 1);
        }
    }
}

// --- Funciones del JEFE ---

// Genera al jefe basado en cuántas veces ha aparecido
function spawnBoss(bossAppearanceLevel) {
    if (boss) return; // Ya hay un jefe

    console.log(`¡Aparece el JEFE (Encuentro N. ${bossAppearanceLevel})!`);
    // Limpiar enemigos normales, lasers y powerups
    enemies = []; lasers = []; powerUps = [];

    // Cambiar música
    bgMusic.pause();
    bossMusic.currentTime = 0; bossMusic.volume = 0.3;
    bossMusic.play().catch(e => console.warn("Música del jefe necesita interacción del usuario"));

    // Calcular atributos basados en el nivel de aparición
    const health = BOSS_BASE_HEALTH + (bossAppearanceLevel - 1) * 8;
    const size = Math.min(canvas.width * 0.4, BOSS_BASE_SIZE + (bossAppearanceLevel - 1) * 5); // Limitar tamaño máximo
    const shootInterval = Math.max(45, BOSS_SHOOT_INTERVAL_BASE - (bossAppearanceLevel - 1) * 10); // Limitar intervalo mínimo
    const bossSpeedX = 1.0 + (bossAppearanceLevel * 0.15); // Velocidad horizontal

    boss = {
        x: canvas.width / 2, y: -size, // Aparece desde arriba
        width: size, height: size,
        vx: bossSpeedX * (Math.random() < 0.5 ? 1 : -1), // Dirección inicial aleatoria
        vy: 1.2, // Velocidad de entrada
        health: health, maxHealth: health,
        image: bossImg,
        shootCooldown: shootInterval * 1.5, // Cooldown inicial más largo
        shootInterval: shootInterval,
        soundCooldown: BOSS_SOUND_INTERVAL / 2, // Cooldown para sonidos del jefe
        level: bossAppearanceLevel, // Guardar el nivel de ESTE encuentro
        state: 'entering', // Estado inicial: entrando
        hitTimer: 0 // Timer para efecto visual al ser golpeado
    };
}

function updateBoss() {
    if (!boss) return; // No hay jefe

    // Reducir timer de golpe
    if (boss.hitTimer > 0) boss.hitTimer--;

    // Lógica según el estado del jefe
    if (boss.state === 'entering') {
        boss.y += boss.vy;
        // Cuando llega a su posición vertical, cambia a 'fighting'
        if (boss.y >= boss.height * 0.4) {
            boss.y = boss.height * 0.4; // Fijar posición
            boss.vy = 0;
            boss.state = 'fighting';
            console.log("Jefe entrando en modo lucha.");
        }
    } else if (boss.state === 'fighting') {
        // Moverse horizontalmente y rebotar en los bordes
        boss.x += boss.vx;
        const halfWidth = boss.width / 2;
        if (boss.x <= halfWidth) { // Rebote izquierdo
            boss.x = halfWidth;
            boss.vx = Math.abs(boss.vx); // Cambiar dirección a derecha
        } else if (boss.x >= canvas.width - halfWidth) { // Rebote derecho
            boss.x = canvas.width - halfWidth;
            boss.vx = -Math.abs(boss.vx); // Cambiar dirección a izquierda
        }

        // Disparar periódicamente
        boss.shootCooldown--;
        if (boss.shootCooldown <= 0) {
            bossShoot();
            boss.shootCooldown = boss.shootInterval; // Reiniciar cooldown
        }

        // Reproducir sonidos periódicamente
        boss.soundCooldown--;
        if (boss.soundCooldown <= 0) {
            const soundToPlay = Math.random() < 0.5 ? momoSound1 : momoSound2;
            playSound(soundToPlay);
            boss.soundCooldown = BOSS_SOUND_INTERVAL + (Math.random() - 0.5) * 60; // Reiniciar con variación
        }
    } else if (boss.state === 'dying') {
        // Estado intermedio mientras se reproduce animación/efecto de muerte (si hubiera)
        // Actualmente solo espera antes de cambiar a 'leaving' (ver checkCollisions)
    } else if (boss.state === 'leaving') {
        // Moverse hacia arriba para salir de pantalla
        boss.y += boss.vy; // vy será negativa (asignada en checkCollisions)
        if (boss.y < -boss.height * 1.5) { // Si está completamente fuera
            console.log("Jefe derrotado y fuera de pantalla.");
            bossDefeated(); // Lógica final post-derrota
        }
    }
}

// Lógica de disparo del jefe
function bossShoot() {
    if (!boss || boss.state !== 'fighting') return;

    // Calcular ángulo hacia el jugador
    const playerEffectiveY = player.y - player.height / 2; // Apuntar un poco más arriba del centro del jugador
    const bossFireY = boss.y + boss.height * 0.4; // Punto de origen del disparo
    const angleToPlayer = Math.atan2(playerEffectiveY - bossFireY, player.x - boss.x);

    // Calcular velocidad del láser basada en el nivel del jefe
    const baseSpeed = BOSS_LASER_SPEED + boss.level * 0.1;

    // Disparo principal
    bossLasers.push({
        x: boss.x, y: bossFireY, angle: angleToPlayer,
        vx: Math.cos(angleToPlayer) * baseSpeed,
        vy: Math.sin(angleToPlayer) * baseSpeed,
        width: 8, height: 15, color: 'yellow'
    });

    // Disparos adicionales en niveles más altos
    if (boss.level >= 2) { // Spread shot
        const spreadAngle = Math.PI / 15; // Ángulo de separación
        for (let i = -1; i <= 1; i += 2) { // Disparos a -1 y +1 del ángulo principal
            const currentAngle = angleToPlayer + i * spreadAngle;
            bossLasers.push({
                x: boss.x, y: bossFireY, angle: currentAngle,
                vx: Math.cos(currentAngle) * baseSpeed * 0.9, // Ligeramente más lentos
                vy: Math.sin(currentAngle) * baseSpeed * 0.9,
                width: 7, height: 13, color: '#FFA500' // Naranja
            });
        }
    }
    if (boss.level >= 4) { // Side shots (desde los "hombros")
        const shoulderOffset = boss.width * 0.3;
        const sideAngleOffset = Math.PI / 10; // Desfase angular
        // Izquierdo
        bossLasers.push({
            x: boss.x - shoulderOffset, y: boss.y + boss.height * 0.2, angle: angleToPlayer + sideAngleOffset,
            vx: Math.cos(angleToPlayer + sideAngleOffset) * baseSpeed * 0.8,
            vy: Math.sin(angleToPlayer + sideAngleOffset) * baseSpeed * 0.8,
            width: 6, height: 12, color: 'pink'
        });
        // Derecho
        bossLasers.push({
            x: boss.x + shoulderOffset, y: boss.y + boss.height * 0.2, angle: angleToPlayer - sideAngleOffset,
            vx: Math.cos(angleToPlayer - sideAngleOffset) * baseSpeed * 0.8,
            vy: Math.sin(angleToPlayer - sideAngleOffset) * baseSpeed * 0.8,
            width: 6, height: 12, color: 'pink'
        });
    }
}

// Mueve los láseres del jefe y los elimina si salen de pantalla
function updateBossLasers() {
    for (let i = bossLasers.length - 1; i >= 0; i--) {
        const l = bossLasers[i];
        l.x += l.vx;
        l.y += l.vy;
        // Eliminar si está muy fuera del canvas
        if (l.x < -l.width * 2 || l.x > canvas.width + l.width*2 || l.y < -l.height*2 || l.y > canvas.height + l.height*2) {
            bossLasers.splice(i, 1);
        }
    }
}

// Se llama cuando el jefe sale completamente de pantalla después de ser derrotado
function bossDefeated() {
    boss = null; // Eliminar objeto jefe
    // bossLasers ya se limpiaron cuando cambió a 'leaving' o se limpian aquí por si acaso
    bossLasers = [];

    // Restaurar música normal
    bossMusic.pause();
    bgMusic.currentTime = 0; // Reiniciar
    bgMusic.play().catch(e => console.warn("Música normal necesita interacción"));

    // Reajustar spawn rate de enemigos normales basado en el nivel actual
    enemySpawnRate = Math.max(30, ENEMY_SPAWN_RATE_INITIAL * Math.pow(ENEMY_SPAWN_RATE_INCREASE, level - 1));
    enemySpawnCounter = enemySpawnRate; // Forzar spawn casi inmediato

    // Soltar recompensas (power-ups)
    spawnPowerUp();
    if (boss && boss.level >= 3) spawnPowerUp(); // Soltar dos si el jefe era de nivel alto
}

// --- Detección de Colisiones ---
function checkCollisions() {
    // 1. Lasers del Jugador vs Enemigos normales
    for (let i = lasers.length - 1; i >= 0; i--) {
        if (!lasers[i]) continue; // Seguridad por si el láser fue eliminado en otra colisión
        const l = lasers[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (!enemies[j]) continue;
            const e = enemies[j];
            const dx = l.x - e.x;
            const dy = l.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Colisión detectada (usando 85% del radio combinado para ser más permisivo)
            if (dist < (l.height / 2 + e.width / 2) * 0.85) {
                lasers.splice(i, 1); // Eliminar láser
                enemies.splice(j, 1); // Eliminar enemigo
                playSound(killSound);

                // Actualizar puntaje y contador de kills
                score += POINTS_PER_ENEMY;
                enemyKillCount++;
                // console.log(`Enemigo derrotado. Kills: ${enemyKillCount}, Score: ${score}`);
                updateScoreAndLevel(); // Actualizar UI y nivel de dificultad

                // Comprobar si se alcanzó el umbral para llamar al jefe
                if (enemyKillCount > 0 && enemyKillCount % BOSS_KILL_THRESHOLD === 0) {
                    // Solo llamar si no hay jefe o si el anterior ya se está yendo
                    if (!boss || boss.state === 'leaving') {
                        const bossAppearanceLevel = Math.floor(enemyKillCount / BOSS_KILL_THRESHOLD);
                        console.log(`Threshold alcanzado (${enemyKillCount} kills). Llamando jefe Nivel ${bossAppearanceLevel}`);
                        spawnBoss(bossAppearanceLevel);
                    } else {
                        console.log(`Threshold alcanzado (${enemyKillCount} kills), pero jefe actual aún activo.`);
                    }
                }
                break; // Salir del bucle de enemigos (este láser ya colisionó)
            }
        }
    }

    // 2. Lasers del Jugador vs Jefe
    if (boss && boss.state === 'fighting') {
        for (let i = lasers.length - 1; i >= 0; i--) {
            if (!lasers[i]) continue;
            const l = lasers[i];
            const dx = l.x - boss.x;
            const dy = l.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Colisión (usando 80% del radio para ajustar hitbox)
            if (dist < boss.width / 2 * 0.8) {
                lasers.splice(i, 1); // Eliminar láser
                boss.health--;
                boss.hitTimer = 5; // Activar efecto visual de golpe

                // Si la vida llega a 0
                if (boss.health <= 0) {
                    console.log("¡JEFE DERROTADO!");
                    playSound(killSound); // Sonido de muerte

                    // Dar puntos por derrotar al jefe (basado en su nivel)
                    score += BOSS_POINTS_DEFEAT_BASE * boss.level;
                    updateScoreAndLevel(); // Actualizar UI

                    // Cambiar estado a 'dying', detener movimiento horizontal
                    boss.state = 'dying'; boss.vx = 0;
                    // Esperar un poco y luego cambiar a 'leaving' para que suba
                    setTimeout(() => {
                        // Verificar que el jefe aún exista y esté en 'dying'
                        if (boss && boss.state === 'dying') {
                            boss.state = 'leaving';
                            boss.vy = -2; // Velocidad de salida hacia arriba
                            bossLasers = []; // Limpiar sus láseres restantes
                        }
                    }, 1500); // Esperar 1.5 segundos
                }
                break; // Salir del bucle de láseres (este ya golpeó)
            }
        }
    }

    // 3. Jugador vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
         if (!powerUps[i]) continue;
         const p = powerUps[i];
         const dx = player.x - (p.x); // Comparar centros
         const dy = player.y - (p.y);
         const dist = Math.sqrt(dx * dx + dy * dy);
         // Colisión (90% del radio combinado)
         if (dist < (player.width / 2 + p.width / 2) * 0.9) {
             applyPowerUp(p.type); // Aplicar efecto
             powerUps.splice(i, 1); // Eliminar powerup
         }
    }

    // 4. Colisiones que dañan al Jugador (solo si NO es invencible)
    if (!player.invincible) {
        // a) Jugador vs Enemigos normales
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (!enemies[i]) continue;
            const e = enemies[i];
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Colisión (70% del radio, hitbox más pequeña para el jugador)
            if (dist < (player.width / 2 + e.width / 2) * 0.70) {
                hitPlayer(); // Aplicar daño al jugador
                return; // Salir de checkCollisions (ya recibió daño)
            }
        }

        // b) Jugador vs Cuerpo del Jefe (si está entrando o luchando)
        if (boss && (boss.state === 'fighting' || boss.state === 'entering')) {
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Colisión (65% del radio)
            if (dist < (player.width / 2 + boss.width / 2) * 0.65) {
                hitPlayer();
                return;
            }
        }

        // c) Jugador vs Láseres del Jefe
        for (let i = bossLasers.length - 1; i >= 0; i--) {
            // No necesitamos verificar invencibilidad aquí de nuevo, ya está en el if externo
            if (!bossLasers[i]) continue;
            const l = bossLasers[i];
            const dx = player.x - l.x;
            const dy = player.y - l.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Colisión (75% del radio)
            if (dist < (player.width / 2 + l.width / 2) * 0.75) {
                bossLasers.splice(i, 1); // Eliminar láser del jefe
                hitPlayer();
                return; // Salir, solo un golpe por frame
            }
        }
    }
}


// Se llama cuando el jugador recibe daño
function hitPlayer() {
    // Doble chequeo por si acaso
    if (player.invincible && player.invincibilityTimer > 0) return;

    lives--;
    updateScoreAndLevel(); // Actualizar UI de vidas

    // Comprobar Game Over
    if (lives <= 0) {
        gameOver("¡HAS PERDIDO!");
        return;
    }

    // Limpiar área alrededor del jugador al reaparecer
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const clearRadius = player.width * 2.5;
    let enemiesCleared = 0, bossLasersCleared = 0;

    // Eliminar enemigos cercanos
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i]) continue;
        const enemy = enemies[i];
        const dx = enemy.x - centerX;
        const dy = enemy.y - centerY;
        if (Math.sqrt(dx * dx + dy * dy) < clearRadius) {
            enemies.splice(i, 1);
            enemiesCleared++;
        }
    }
    // Eliminar láseres del jefe cercanos
    for (let i = bossLasers.length - 1; i >= 0; i--) {
        if (!bossLasers[i]) continue;
        const laser = bossLasers[i];
        const dx = laser.x - centerX;
        const dy = laser.y - centerY;
        if (Math.sqrt(dx * dx + dy * dy) < clearRadius * 1.5) { // Radio mayor para láseres
            bossLasers.splice(i, 1);
            bossLasersCleared++;
        }
    }

    // Reposicionar jugador en el centro y dar invencibilidad temporal
    player.x = centerX;
    player.y = centerY;
    player.vx = 0; player.vy = 0;
    player.angle = -Math.PI / 2; // Apuntar arriba
    player.invincible = true;
    player.invincibilityTimer = INVINCIBILITY_DURATION;

    console.log(`Golpe! Vidas: ${lives}. ${enemiesCleared} enem. / ${bossLasersCleared} lás. jefe elim. Invencible ${INVINCIBILITY_DURATION}ms.`);
    // Podría añadirse un sonido de golpe aquí si se desea
}

// Aplica el efecto de un power-up recogido
function applyPowerUp(type) {
    if (type === 'fast_shot') { // En realidad, es Vida Extra según la imagen man.png
        lives = Math.min(lives + 1, INITIAL_LIVES + 2); // Sumar vida (con límite)
        updateScoreAndLevel(); // Actualizar UI
        console.log("Vida extra!");
        // Podría añadirse un sonido de powerup aquí
    } else if (type === 'clear_screen') { // Limpiar enemigos normales
        score += enemies.length * POINTS_PER_ENEMY; // Dar puntos por enemigos eliminados
        enemies = []; // Vaciar array de enemigos
        playSound(killSound); // Usar sonido de kill múltiple
        updateScoreAndLevel(); // Actualizar UI (por si cambió el score/nivel)
        console.log("Pantalla despejada (enemigos normales)!");
    }
    // 'fast_shot' real podría implementarse cambiando player.currentFireRate y usando fireRateBoostTimer
}

// Actualiza el puntaje y el nivel en la UI y ajusta dificultad
function updateScoreAndLevel() {
    scoreDisplay.textContent = `Puntaje: ${score}`;
    livesDisplay.textContent = `Vidas: ${lives}`;

    const previousLevel = level;
    // Calcular nuevo nivel basado en score (ej: 1 nivel cada 20 puntos)
    const pointsPerLevel = 20;
    const newLevel = Math.floor(score / pointsPerLevel) + 1;

    // Siempre mostrar el nivel actual en UI
    levelDisplay.textContent = `Nivel: ${level}`;

    // Si el nivel calculado es mayor que el actual
    if (newLevel > previousLevel) {
        console.log(`Nivel visual subió: ${previousLevel} -> ${newLevel}`);
        level = newLevel; // Actualizar nivel interno
        levelDisplay.textContent = `Nivel: ${level}`; // Actualizar UI con nuevo nivel
        playSound(newStageSound); // Sonido de subida de nivel

        // Ajustar dificultad de enemigos normales (spawn rate) basado en el nuevo nivel
        enemySpawnRate = Math.max(30, ENEMY_SPAWN_RATE_INITIAL * Math.pow(ENEMY_SPAWN_RATE_INCREASE, level - 1));
        console.log(`Nivel ${level}! Spawn Rate (normal): ${enemySpawnRate.toFixed(1)} frames`);
    }
}


// --- Funciones de Dibujo ---

function drawPlayer() {
    ctx.save(); // Guardar estado del canvas
    ctx.translate(player.x, player.y); // Mover origen al centro del jugador
    ctx.rotate(player.angle + Math.PI / 2); // Rotar (sumar 90 grados porque la imagen base apunta hacia arriba)

    // Efecto de parpadeo durante invencibilidad
    let alpha = 1.0;
    if (player.invincible) {
        // Hacer parpadear cambiando alpha (visible/invisible)
        const blinkRate = 100; // ms por parpadeo
        if (Math.floor(Date.now() / blinkRate) % 2 === 0) {
            alpha = 0.4; // Semitransparente
        }
    }
    ctx.globalAlpha = alpha;

    // Dibujar imagen del jugador centrada
    try {
        if (playerImg.complete && playerImg.naturalWidth > 0) {
             ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
        } else {
             // Dibujar un marcador si la imagen no carga
             ctx.fillStyle = "blue";
             ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        }
    } catch (e) {
        console.error("Error dibujando jugador:", e);
    }


    ctx.globalAlpha = 1.0; // Restaurar alpha
    ctx.restore(); // Restaurar estado del canvas
}

function drawLasers() {
    lasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle + Math.PI / 2); // Rotar láser
        ctx.fillStyle = "lime"; // Color del láser del jugador
        ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height); // Dibujar rectángulo
        ctx.restore();
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        // Podría añadirse rotación si se quisiera
        // ctx.rotate(algunAngulo);
         try {
            if (e.image && e.image.complete && e.image.naturalWidth > 0) {
                 ctx.drawImage(e.image, -e.width / 2, -e.height / 2, e.width, e.height);
            } else {
                 ctx.fillStyle = "red"; // Marcador si no carga imagen
                 ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
                 if (!e.image) console.warn("Enemigo sin imagen asignada");
            }
         } catch(err) {
             console.error(`Error dibujando enemigo ${e.type}:`, err)
         }

        ctx.restore();
    });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
         try {
             if (p.image && p.image.complete && p.image.naturalWidth > 0) {
                ctx.drawImage(p.image, -p.width / 2, -p.height / 2, p.width, p.height);
             } else {
                 ctx.fillStyle = "cyan"; // Marcador
                 ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
                 if (!p.image) console.warn("Powerup sin imagen asignada");
             }
         } catch(err) {
             console.error(`Error dibujando powerup ${p.type}:`, err)
         }
        ctx.restore();
    });
}

// Dibuja la barra de vida del jefe en la esquina superior izquierda
function drawBossUI() {
    if (boss && (boss.state === 'fighting' || boss.state === 'entering' || boss.state === 'dying')) {
        const barWidth = canvas.width * 0.4;
        const barHeight = 20;
        const barX = 15;
        const barY = 15;

        const healthPercent = Math.max(0, boss.health / boss.maxHealth);

        // Etiqueta del jefe
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`JEFE MOMO Nv. ${boss.level}`, barX, barY + barHeight + 18);

        // Fondo de la barra (rojo oscuro)
        ctx.fillStyle = 'rgba(100, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        // Vida actual (verde)
        ctx.fillStyle = 'rgba(0, 200, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        // Borde
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Texto de vida (opcional, sobre la barra)
         ctx.fillStyle = "white";
         ctx.font = "bold 12px Arial";
         ctx.textAlign = "center";
         ctx.textBaseline = "middle";
         ctx.fillText(`${boss.health} / ${boss.maxHealth}`, barX + barWidth / 2, barY + barHeight / 2);
         ctx.textBaseline = "alphabetic"; // Restaurar línea base
         ctx.textAlign = "start"; // Restaurar alineación por defecto
    }
}

// Dibuja al jefe (sin la barra de vida, esa va en drawBossUI)
function drawBoss() {
    if (!boss) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Efecto de brillo al ser golpeado
    let activeFilter = 'none';
    if (boss.hitTimer > 0) {
        activeFilter = 'brightness(2.5)'; // Hacerlo brillar
    }
    // Efecto de parpadeo al morir
    let dyingAlpha = 1.0;
    if (boss.state === 'dying') {
        if (Math.floor(Date.now() / 80) % 2 === 0) { // Parpadeo rápido
            dyingAlpha = 0.3;
        }
    }
    ctx.filter = activeFilter;
    ctx.globalAlpha = dyingAlpha;

     try {
         if (boss.image && boss.image.complete && boss.image.naturalWidth > 0) {
             ctx.drawImage(boss.image, -boss.width / 2, -boss.height / 2, boss.width, boss.height);
         } else {
             ctx.fillStyle = "purple"; // Marcador si no carga
             ctx.fillRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height);
             if (!boss.image) console.warn("Jefe sin imagen asignada");
         }
     } catch(err) {
        console.error("Error dibujando jefe:", err);
     }


    // Restaurar filtro y alpha
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

function drawBossLasers() {
    bossLasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle + Math.PI / 2); // Rotar láser
        ctx.fillStyle = l.color || "yellow"; // Usar color definido o amarillo por defecto
        ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height); // Dibujar rectángulo
        ctx.restore();
    });
}

// --- Bucle Principal y Gestión del Juego ---

function gameLoop() {
    // Detener si el juego no está corriendo
    if (!gameRunning) {
        console.log("gameLoop detenido porque gameRunning es false.");
        return;
    }

    // 1. Actualizar Estado de todos los elementos
    updatePlayer();
    updateLasers();
    updateEnemies();
    updatePowerUps();
    updateBoss();
    updateBossLasers();

    // 2. Comprobar Colisiones
    checkCollisions();

    // 3. Dibujar todo (si el juego sigue corriendo después de colisiones)
    if (gameRunning) {
        // Limpiar canvas y dibujar fondo
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar siempre
        try {
             if (bgImg.complete && bgImg.naturalWidth > 0) {
                 ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
             } else {
                 ctx.fillStyle = "#000011"; // Fondo oscuro si no carga imagen
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
             }
        } catch (e) {
            console.error("Error dibujando fondo:", e);
             ctx.fillStyle = "#000011";
             ctx.fillRect(0, 0, canvas.width, canvas.height);
        }


        // Dibujar elementos del juego
        drawEnemies();
        drawPowerUps();
        drawLasers(); // Lasers del jugador
        drawBossLasers(); // Lasers del jefe
        drawBoss();
        drawPlayer(); // Dibujar jugador al final para que esté encima

        // Dibujar UI específica del jefe (barra de vida)
        drawBossUI();
        // La UI normal (score, lives, level) está en el HTML con CSS position:absolute

        // 4. Solicitar el siguiente frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    // Evitar iniciar si ya está corriendo
    if (gameRunning) return;
    console.log("Starting game...");

    // Resetear estado del juego
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    enemyKillCount = 0;
    lasers = [];
    enemies = [];
    powerUps = [];
    keys = {}; // Limpiar teclas presionadas
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
    boss = null; // Asegurarse de que no haya jefe
    bossLasers = [];

    // Resetear jugador (con invencibilidad inicial)
    player = {
        x: canvas.width / 2, y: canvas.height / 2,
        width: PLAYER_SIZE, height: PLAYER_SIZE,
        angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18,
        fireRateBoostTimer: 0,
        invincible: true, invincibilityTimer: INVINCIBILITY_DURATION
    };

    updateScoreAndLevel(); // Actualizar UI inicial (puntaje 0, vidas 3, nivel 1)

    // Ocultar botón de inicio, marcar juego como corriendo
    gameRunning = true;
    startButton.style.display = 'none';
    instructionsDiv.style.display = 'none'; // Ocultar instrucciones también

    // Manejar música
    bossMusic.pause(); bossMusic.currentTime = 0; // Detener música jefe si estaba sonando
    bgMusic.volume = 0.2; bgMusic.currentTime = 0; // Poner volumen bajo y reiniciar
    bgMusic.play().catch(e => console.warn("Música de fondo requiere interacción del usuario."));

    // Cancelar frame anterior (si hubiera) e iniciar el bucle del juego
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    console.log("Game loop requested.");
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    if (!gameRunning) {
        // console.log("gameOver llamado pero gameRunning ya era false.");
        return; // Evitar múltiples llamadas
    }
    console.log(`Game Over: ${message}`);
    gameRunning = false; // Detener el bucle
    cancelAnimationFrame(animationFrameId);

    // Pausar toda la música
    bgMusic.pause();
    bossMusic.pause();

    // Mostrar pantalla de Game Over después de un breve retraso
    // para asegurar que el último frame no se sobreescriba inmediatamente
    setTimeout(() => {
        // Fondo semitransparente oscuro
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Texto de Game Over
        ctx.fillStyle = "white";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "20px Arial";
        ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);

        // Mostrar botón para jugar de nuevo
        startButton.textContent = "Jugar de Nuevo";
        startButton.style.display = 'block';
        instructionsDiv.style.display = 'block'; // Mostrar instrucciones de nuevo
    }, 50); // 50ms de retraso
}

// --- Inicialización ---

// Asignar función startGame al botón de inicio
startButton.addEventListener('click', startGame);

// Función para mostrar la pantalla inicial antes de empezar el juego
function showInitialScreen() {
    gameRunning = false; // Asegurarse de que el juego no esté corriendo
    cancelAnimationFrame(animationFrameId); // Detener bucle si estaba activo

    // Dibujar fondo negro o imagen de fondo si ya cargó
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    try {
        if (bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } else {
             console.log("Imagen de fondo aún no lista para pantalla inicial.");
        }
    } catch (e) {
        console.error("Error dibujando imagen de fondo inicial:", e);
    }


    // Dibujar recuadro semitransparente para el texto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(canvas.width * 0.1, canvas.height * 0.3, canvas.width * 0.8, canvas.height * 0.4);

    // Dibujar texto
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDES INFINITO', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('¡Momo acecha!', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Pulsa "Iniciar Juego"', canvas.width / 2, canvas.height / 2 + 40);

    // Mostrar botón de inicio
    startButton.textContent = "Iniciar Juego";
    startButton.style.display = 'block';
    instructionsDiv.style.display = 'block';
}

// --- Esperar a que las imágenes esenciales carguen ---
// Comprobar periódicamente si las imágenes MÍNIMAS (jugador, fondo, jefe) han cargado
// para poder mostrar la pantalla inicial sin esperar a TODO (enemigos, powerups)
let essentialImagesCheck = setInterval(() => {
    let loaded = 0;
    if (playerImg.complete && playerImg.naturalWidth > 0) loaded++;
    if (bgImg.complete && bgImg.naturalWidth > 0) loaded++;
    if (bossImg.complete && bossImg.naturalWidth > 0) loaded++;

    // Si las 3 imágenes esenciales cargaron
    if (loaded >= 3) {
        clearInterval(essentialImagesCheck); // Detener la comprobación
        if (!gameRunning) { // Solo mostrar si el juego no ha sido iniciado ya por el usuario
             showInitialScreen();
        }
    }
}, 100); // Comprobar cada 100ms

// Fallback por si alguna imagen esencial tarda demasiado o falla
setTimeout(() => {
     clearInterval(essentialImagesCheck); // Detener la comprobación después de 7 segundos
     // Si el juego no ha empezado y no todas las imágenes cargaron, mostrar pantalla inicial igualmente
     if (!gameRunning && imagesLoadedCount < totalImagesToLoad) {
         console.warn("Fallback: Algunas imágenes no cargaron a tiempo, mostrando pantalla inicial.");
         showInitialScreen();
     }
}, 7000); // 7 segundos de tiempo límite

// Mostrar pantalla inicial inmediatamente si es posible (ej. imágenes en caché)
// Opcional: podrías llamar showInitialScreen() aquí directamente,
// pero el interval/timeout ya se encarga de ello cuando las imgs carguen.
// showInitialScreen();