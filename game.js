// ========================================================================= //
//                                                                           //
//   CONTENIDO COMPLETO DE game.js (Zom x2 Nivel + UI Jefe Inf-Izq + UI Mejorada) //
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
powerUpImages.clear_screen.src = 'luc.png'; // Limpiar pantalla (enemigos normales)
const bossImg = new Image(); bossImg.src = 'momo.png';
const zomImg = new Image(); zomImg.src = 'zom.png';

// Sonidos (IDs deben coincidir con el HTML)
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');
const momoSound1 = document.getElementById('momoSound1');
const momoSound2 = document.getElementById('momo2.mp3'); // Corregido: Debe ser momo2.mp3 si el ID es momoSound2
const bossMusic = document.getElementById('bossMusic');
const kapumSound = document.getElementById('kapumSound');
const zomSound = document.getElementById('zomSound');

// --- Configuración del Juego ---
const PLAYER_SIZE = 80;
const ENEMY_SIZE = 70;
const ZOM_SIZE = 75;
const POWERUP_SIZE = 60;
const LASER_SPEED = 6;
const PLAYER_TURN_SPEED = 0.09;
const PLAYER_THRUST = 0.1;
const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.4;
const ENEMY_SPEED_MAX = 1.2;
const ZOM_SPEED = 2.8;
const POINTS_PER_ENEMY = 1;
const POINTS_PER_ZOM = 5;
const POWERUP_CHANCE = 0.0015;
const POWERUP_DURATION = 8000; // ms
const RARE_POWERUP_CHANCE_MOD = 0.4;
const ENEMY_SPAWN_RATE_INITIAL = 140;
const ENEMY_SPAWN_RATE_INCREASE = 0.96;
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 3500; // ms
const MAX_ZOMS_PER_LEVEL = 2; // <-- LÍMITE DE ZOMS POR NIVEL

// --- Configuración del Jefe ---
const BOSS_BASE_SIZE = 160;
const BOSS_BASE_HEALTH = 15;
const BOSS_LASER_SPEED = 4.5;
const BOSS_SHOOT_INTERVAL_BASE = 150;
const BOSS_SOUND_INTERVAL = 240;
const BOSS_POINTS_DEFEAT_BASE = 100;
const BOSS_KILL_THRESHOLD = 10; // Enemigos normales para que aparezca el jefe

// --- Variables de Estado del Juego ---
let score = 0;
let level = 1;
let lives = INITIAL_LIVES;
let gameRunning = false;
let animationFrameId;
let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
let enemyKillCount = 0; // Contador de enemigos normales eliminados
let zomsSpawnedThisLevel = 0; // <-- Contador de Zoms generados en el nivel actual

let player = {
    x: canvas.width / 2, y: canvas.height / 2,
    width: PLAYER_SIZE, height: PLAYER_SIZE,
    angle: -Math.PI / 2,
    vx: 0, vy: 0,
    rotation: 0,
    thrusting: false,
    shootCooldown: 0, baseFireRate: 18,
    currentFireRate: 18,
    fireRateBoostTimer: 0,
    invincible: false,
    invincibilityTimer: 0
};

let lasers = [];
let enemies = []; // Enemigos normales (lex, mau)
let zomEnemies = []; // Array para enemigos Zom
let powerUps = [];
let keys = {};

// --- Variables del Jefe ---
let boss = null;
let bossLasers = [];

// --- Carga de Imágenes ---
let imagesLoadedCount = 0;
const totalImagesToLoad = 1 + 1 + Object.keys(enemyImages).length + Object.keys(powerUpImages).length + 1 + 1; // player, bg, enemies, powerups, boss, zom

function imageLoaded() {
    imagesLoadedCount++;
    // console.log(`Imagen cargada (${imagesLoadedCount}/${totalImagesToLoad})`); // Descomentar para depurar carga
    if (imagesLoadedCount === totalImagesToLoad) {
        console.log("Todas las imágenes cargadas.");
    }
}

[playerImg, bgImg, enemyImages.lex, enemyImages.mau, powerUpImages.fast_shot, powerUpImages.clear_screen, bossImg, zomImg].forEach(img => {
    img.onload = imageLoaded;
    img.onerror = () => console.error(`Error cargando ${img.src}`);
    if (img.complete && img.naturalWidth > 0) {
        imageLoaded();
    }
});

// --- Controles (Teclado y Táctil) ---
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
    if (keys[e.code] === true) {
         keys[e.code] = false;
    }
});

function handleTouchStart(e, keyCode) {
    e.preventDefault();
    keys[keyCode] = true;
}
function handleTouchEnd(e, keyCode) {
    e.preventDefault();
    keys[keyCode] = false;
}

[{el: dpadUp, key: 'ArrowUp'}, {el: dpadLeft, key: 'ArrowLeft'}, {el: dpadRight, key: 'ArrowRight'}, {el: shootButton, key: 'Space'}].forEach(item => {
    item.el.addEventListener('touchstart', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('touchend', (e) => handleTouchEnd(e, item.key), { passive: false });
    item.el.addEventListener('mousedown', (e) => handleTouchStart(e, item.key), { passive: false });
    item.el.addEventListener('mouseup', (e) => handleTouchEnd(e, item.key), { passive: false });
    item.el.addEventListener('touchcancel', (e) => handleTouchEnd(e, item.key), { passive: false });
});


// --- Funciones del Juego ---

function playSound(sound) {
    if (!sound) {
        console.warn("Intento de reproducir sonido nulo.");
        return;
    }
    const clone = sound.cloneNode();
    clone.volume = sound.volume || 0.5;
    clone.play().catch(e => {
        // Silenciar advertencias comunes de interacción del usuario
        if (!e.message.includes("user interaction")) {
             const soundId = sound.id || 'desconocido';
             console.warn(`Advertencia sonido (${soundId}): ${e.message}`);
        }
    });
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
    player.rotation = keys['ArrowLeft'] ? -PLAYER_TURN_SPEED : (keys['ArrowRight'] ? PLAYER_TURN_SPEED : 0);
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
    // Permite disparar incluso si el jugador es invencible.
    if (keys['Space'] && player.shootCooldown <= 0) {
        shootLaser();
        player.shootCooldown = player.currentFireRate;
    }
    if (player.invincible) {
        player.invincibilityTimer -= 1000 / 60; // Asumiendo 60 FPS
        if (player.invincibilityTimer <= 0) {
            player.invincible = false;
            // console.log("Invencibilidad terminada."); // Descomentar para depurar
        }
    }
}

function shootLaser() {
    const angle = player.angle;
    const originDist = player.width / 2;
    const startX = player.x + Math.cos(angle) * originDist;
    const startY = player.y + Math.sin(angle) * originDist;
    lasers.push({
        x: startX, y: startY,
        angle: angle,
        vx: Math.cos(angle) * LASER_SPEED + player.vx * 0.4,
        vy: Math.sin(angle) * LASER_SPEED + player.vy * 0.4,
        width: 5, height: 10
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

// Función para generar enemigos normales (lex, mau)
function spawnNormalEnemy() {
    if (boss && boss.state !== 'leaving') return; // No spawnear si el jefe está activo

    const type = Math.random() < 0.5 ? 'lex' : 'mau';
    const edge = Math.floor(Math.random() * 4);
    const w = canvas.width, h = canvas.height;
    const margin = ENEMY_SIZE * 1.5;
    let x, y;
    if (edge === 0)      { x = Math.random() * w; y = -margin; }
    else if (edge === 1) { x = w + margin;        y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h + margin; }
    else                 { x = -margin;           y = Math.random() * h; }

    const angleToCenter = Math.atan2(h / 2 - y, w / 2 - x);
    const angleVariation = (Math.random() - 0.5) * (Math.PI / 2);
    const angle = angleToCenter + angleVariation;
    const speed = ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.08);

    enemies.push({
        x: x, y: y,
        width: ENEMY_SIZE, height: ENEMY_SIZE,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: type,
        image: enemyImages[type]
    });
}

// Función para generar UN enemigo Zom (controlado por el contador)
function spawnZomEnemy() {
    // No generar si el jefe está activo (excepto si está saliendo)
    if (boss && boss.state !== 'leaving') {
        // console.log("Intento de spawnear Zom bloqueado por jefe activo.");
        return false; // Indicar que no se generó
    }

    // *** Comprobar límite por nivel ***
    if (zomsSpawnedThisLevel >= MAX_ZOMS_PER_LEVEL) {
        // console.log(`Límite de ${MAX_ZOMS_PER_LEVEL} Zoms para el nivel ${level} alcanzado. No se genera.`);
        return false; // Indicar que no se generó
    }

    const edge = Math.floor(Math.random() * 4);
    const w = canvas.width, h = canvas.height;
    const margin = ZOM_SIZE * 1.5;
    let x, y;
    if (edge === 0)      { x = Math.random() * w; y = -margin; }
    else if (edge === 1) { x = w + margin;        y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = h + margin; }
    else                 { x = -margin;           y = Math.random() * h; }

    zomEnemies.push({
        x: x, y: y,
        width: ZOM_SIZE, height: ZOM_SIZE,
        vx: 0, vy: 0, // Se establecerá en updateZomEnemies
        type: 'zom',
        image: zomImg
    });

    zomsSpawnedThisLevel++; // Incrementar contador
    console.log(`Zom aparecido (${zomsSpawnedThisLevel}/${MAX_ZOMS_PER_LEVEL} en Nivel ${level}).`);

    // *** NUEVO: Reproducir sonido Zom al aparecer ***
    playSound(zomSound);

    return true; // Indicar que se generó
}

// NUEVA función para programar los Zoms del nivel
function scheduleLevelZoms() {
    // console.log(`Programando ${MAX_ZOMS_PER_LEVEL} Zoms para el nivel ${level}.`);
    // Llama a spawnZomEnemy dos veces, con un retraso entre ellas.
    // Solo se generarán si las condiciones dentro de spawnZomEnemy lo permiten.
    setTimeout(() => { spawnZomEnemy(); }, 1500); // Intenta generar el primer Zom a 1.5s
    setTimeout(() => { spawnZomEnemy(); }, 3500); // Intenta generar el segundo Zom a 3.5s
}

// Actualiza solo enemigos normales
function updateNormalEnemies() {
    if (!boss || boss.state === 'leaving') {
        enemySpawnCounter++;
        const maxEnemies = 10 + level; // Limitar enemigos normales en pantalla
        if (enemySpawnCounter >= enemySpawnRate && enemies.length < maxEnemies) {
            spawnNormalEnemy();
            enemySpawnCounter = 0;
        }
    }
    enemies.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        wrapAround(e);
    });
}

// Actualiza enemigos Zom
function updateZomEnemies() {
    zomEnemies.forEach(e => {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const angleToPlayer = Math.atan2(dy, dx);

        e.vx = Math.cos(angleToPlayer) * ZOM_SPEED;
        e.vy = Math.sin(angleToPlayer) * ZOM_SPEED;

        e.x += e.vx;
        e.y += e.vy;
        wrapAround(e);
    });
}

function spawnPowerUp() {
    const padding = POWERUP_SIZE * 1.5;
    const x = padding + Math.random() * (canvas.width - 2 * padding);
    const y = padding + Math.random() * (canvas.height - 2 * padding);
    const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot'; // fast_shot es vida extra
    powerUps.push({
        x: x, y: y,
        width: POWERUP_SIZE, height: POWERUP_SIZE,
        type: type, image: powerUpImages[type],
        creationTime: Date.now()
    });
}

function updatePowerUps() {
    if (!boss && Math.random() < POWERUP_CHANCE && powerUps.length < 3) {
        spawnPowerUp();
    }
    const now = Date.now();
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (now - powerUps[i].creationTime > POWERUP_DURATION) {
            powerUps.splice(i, 1);
        }
    }
}

// --- Funciones del JEFE ---
function spawnBoss(bossAppearanceLevel) {
    if (boss) return;
    console.log(`¡Aparece el JEFE (Encuentro N. ${bossAppearanceLevel})!`);
    // Limpiar TODO al aparecer el jefe
    enemies = []; lasers = []; powerUps = []; zomEnemies = []; // Limpiar Zoms existentes también
    zomsSpawnedThisLevel = MAX_ZOMS_PER_LEVEL; // Considerar Zoms del nivel como "cancelados" por el jefe

    bgMusic.pause();
    bossMusic.currentTime = 0; bossMusic.volume = 0.3;
    bossMusic.play().catch(e => console.warn("Música del jefe necesita interacción del usuario"));

    const health = BOSS_BASE_HEALTH + (bossAppearanceLevel - 1) * 8;
    const size = Math.min(canvas.width * 0.4, BOSS_BASE_SIZE + (bossAppearanceLevel - 1) * 5);
    const shootInterval = Math.max(45, BOSS_SHOOT_INTERVAL_BASE - (bossAppearanceLevel - 1) * 10);
    const bossSpeedX = 1.0 + (bossAppearanceLevel * 0.15);

    boss = {
        x: canvas.width / 2, y: -size,
        width: size, height: size,
        vx: bossSpeedX * (Math.random() < 0.5 ? 1 : -1),
        vy: 1.2,
        health: health, maxHealth: health,
        image: bossImg,
        shootCooldown: shootInterval * 1.5,
        shootInterval: shootInterval,
        soundCooldown: BOSS_SOUND_INTERVAL / 2,
        level: bossAppearanceLevel,
        state: 'entering',
        hitTimer: 0
    };
}

function updateBoss() {
    if (!boss) return;
    if (boss.hitTimer > 0) boss.hitTimer--;

    if (boss.state === 'entering') {
        boss.y += boss.vy;
        if (boss.y >= boss.height * 0.4) {
            boss.y = boss.height * 0.4;
            boss.vy = 0;
            boss.state = 'fighting';
            console.log("Jefe entrando en modo lucha.");
        }
    } else if (boss.state === 'fighting') {
        boss.x += boss.vx;
        const halfWidth = boss.width / 2;
        if (boss.x <= halfWidth) {
            boss.x = halfWidth;
            boss.vx = Math.abs(boss.vx);
        } else if (boss.x >= canvas.width - halfWidth) {
            boss.x = canvas.width - halfWidth;
            boss.vx = -Math.abs(boss.vx);
        }
        boss.shootCooldown--;
        if (boss.shootCooldown <= 0) {
            bossShoot();
            boss.shootCooldown = boss.shootInterval;
        }
        boss.soundCooldown--;
        if (boss.soundCooldown <= 0) {
            const soundToPlay = Math.random() < 0.5 ? momoSound1 : momoSound2;
            playSound(soundToPlay);
            boss.soundCooldown = BOSS_SOUND_INTERVAL + (Math.random() - 0.5) * 60;
        }
    } else if (boss.state === 'dying') {
        // Animación manejada en drawBoss
    } else if (boss.state === 'leaving') {
        boss.y += boss.vy;
        if (boss.y < -boss.height * 1.5) {
            console.log("Jefe derrotado y fuera de pantalla.");
            bossDefeated(); // Llama a la función para reiniciar música y spawns
        }
    }
}

function bossShoot() {
    if (!boss || boss.state !== 'fighting') return;
    const playerEffectiveY = player.y - player.height / 2;
    const bossFireY = boss.y + boss.height * 0.4;
    const angleToPlayer = Math.atan2(playerEffectiveY - bossFireY, player.x - boss.x);
    const baseSpeed = BOSS_LASER_SPEED + boss.level * 0.1;

    // Disparo principal
    bossLasers.push({
        x: boss.x, y: bossFireY, angle: angleToPlayer,
        vx: Math.cos(angleToPlayer) * baseSpeed,
        vy: Math.sin(angleToPlayer) * baseSpeed,
        width: 8, height: 15, color: 'yellow'
    });

    // Disparos adicionales
    if (boss.level >= 2) { // Triple disparo
        const spreadAngle = Math.PI / 15;
        for (let i = -1; i <= 1; i += 2) {
            const currentAngle = angleToPlayer + i * spreadAngle;
            bossLasers.push({
                x: boss.x, y: bossFireY, angle: currentAngle,
                vx: Math.cos(currentAngle) * baseSpeed * 0.9,
                vy: Math.sin(currentAngle) * baseSpeed * 0.9,
                width: 7, height: 13, color: '#FFA500' // Naranja
            });
        }
    }
    if (boss.level >= 4) { // Disparos desde los "hombros"
        const shoulderOffset = boss.width * 0.3;
        const sideAngleOffset = Math.PI / 10;
        bossLasers.push({
            x: boss.x - shoulderOffset, y: boss.y + boss.height * 0.2, angle: angleToPlayer + sideAngleOffset,
            vx: Math.cos(angleToPlayer + sideAngleOffset) * baseSpeed * 0.8,
            vy: Math.sin(angleToPlayer + sideAngleOffset) * baseSpeed * 0.8,
            width: 6, height: 12, color: 'pink'
        });
        bossLasers.push({
            x: boss.x + shoulderOffset, y: boss.y + boss.height * 0.2, angle: angleToPlayer - sideAngleOffset,
            vx: Math.cos(angleToPlayer - sideAngleOffset) * baseSpeed * 0.8,
            vy: Math.sin(angleToPlayer - sideAngleOffset) * baseSpeed * 0.8,
            width: 6, height: 12, color: 'pink'
        });
    }
}

function updateBossLasers() {
    for (let i = bossLasers.length - 1; i >= 0; i--) {
        const l = bossLasers[i];
        l.x += l.vx;
        l.y += l.vy;
        if (l.x < -l.width * 2 || l.x > canvas.width + l.width*2 || l.y < -l.height*2 || l.y > canvas.height + l.height*2) {
            bossLasers.splice(i, 1);
        }
    }
}

function bossDefeated() {
    boss = null;
    bossLasers = [];
    bossMusic.pause();
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.warn("Música normal necesita interacción"));

    enemySpawnRate = Math.max(30, ENEMY_SPAWN_RATE_INITIAL * Math.pow(ENEMY_SPAWN_RATE_INCREASE, level - 1));
    enemySpawnCounter = enemySpawnRate; // Empezar a spawnear pronto

    spawnPowerUp(); // Recompensa

    // Si al derrotar al jefe, aún no se habían generado los 2 Zoms de este nivel
    // (esto pasa si el jefe apareció justo al subir de nivel, por ejemplo)
    if (zomsSpawnedThisLevel < MAX_ZOMS_PER_LEVEL) {
        console.log(`Jefe derrotado. Programando ${MAX_ZOMS_PER_LEVEL - zomsSpawnedThisLevel} Zom(s) restantes para el nivel ${level}.`);
        // scheduleLevelZoms intentará generar los Zoms restantes.
        // spawnZomEnemy se asegurará de no exceder MAX_ZOMS_PER_LEVEL.
        scheduleLevelZoms();
    }
}

// --- Detección de Colisiones ---
function checkCollisions() {
    // 1. Lasers Jugador vs Enemigos normales
    for (let i = lasers.length - 1; i >= 0; i--) {
        if (!lasers[i]) continue;
        const l = lasers[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (!enemies[j]) continue;
            const e = enemies[j];
            const dx = l.x - e.x; const dy = l.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (l.height / 2 + e.width / 2) * 0.85) {
                lasers.splice(i, 1);
                enemies.splice(j, 1);
                playSound(killSound);
                score += POINTS_PER_ENEMY;
                enemyKillCount++;
                updateScoreAndLevel();
                if (enemyKillCount > 0 && enemyKillCount % BOSS_KILL_THRESHOLD === 0 && (!boss || boss.state === 'leaving')) {
                     const bossAppearanceLevel = Math.floor(enemyKillCount / BOSS_KILL_THRESHOLD);
                     spawnBoss(bossAppearanceLevel);
                }
                break;
            }
        }
         // Salir si el láser ya no existe (colisionó con enemigo normal)
         if (!lasers[i]) continue;

        // 1.5. Lasers Jugador vs Enemigos Zom (misma iteración de láser)
        for (let j = zomEnemies.length - 1; j >= 0; j--) {
            if (!zomEnemies[j]) continue;
            const z = zomEnemies[j];
            const dx = l.x - z.x; const dy = l.y - z.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (l.height / 2 + z.width / 2) * 0.85) {
                lasers.splice(i, 1); // Eliminar láser
                zomEnemies.splice(j, 1); // Eliminar Zom
                // REMOVIDO: playSound(zomSound); // Ya no suena al morir
                score += POINTS_PER_ZOM;
                updateScoreAndLevel(); // Actualizar UI
                console.log("Zom destruido!");
                break; // Salir del bucle interno (Zoms)
            }
        }
    }

    // 2. Lasers Jugador vs Jefe
    if (boss && boss.state === 'fighting') {
        for (let i = lasers.length - 1; i >= 0; i--) {
            if (!lasers[i]) continue;
            const l = lasers[i];
            const dx = l.x - boss.x; const dy = l.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < boss.width / 2 * 0.8) {
                lasers.splice(i, 1);
                boss.health--;
                boss.hitTimer = 5;
                if (boss.health <= 0) {
                    console.log("¡JEFE DERROTADO!");
                    playSound(killSound);
                    score += BOSS_POINTS_DEFEAT_BASE * boss.level;
                    updateScoreAndLevel();
                    boss.state = 'dying';
                    boss.vx = 0;
                    setTimeout(() => {
                        if (boss && boss.state === 'dying') {
                            boss.state = 'leaving';
                            boss.vy = -2;
                            bossLasers = []; // Limpiar láseres al irse
                        }
                    }, 1500);
                }
                break; // Salir del bucle de láseres
            }
        }
    }

    // 3. Jugador vs PowerUps
    for (let i = powerUps.length - 1; i >= 0; i--) {
         if (!powerUps[i]) continue;
         const p = powerUps[i];
         const dx = player.x - p.x; const dy = player.y - p.y;
         const dist = Math.sqrt(dx * dx + dy * dy);
         if (dist < (player.width / 2 + p.width / 2) * 0.9) {
             applyPowerUp(p.type);
             powerUps.splice(i, 1);
         }
    }

    // 4. Colisiones que dañan al Jugador (solo si NO es invencible)
    if (!player.invincible) {
        let hitDetected = false; // Bandera para evitar múltiples hits por frame

        // a) Jugador vs Enemigos normales
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (!enemies[i]) continue;
            const e = enemies[i];
            const dx = player.x - e.x; const dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (player.width / 2 + e.width / 2) * 0.70) {
                hitPlayer();
                hitDetected = true;
                break; // Salir del bucle de enemigos normales
            }
        }

        // a.5) Jugador vs Enemigos Zom
        if (!hitDetected) { // Solo comprobar si no fue golpeado por enemigo normal
            for (let i = zomEnemies.length - 1; i >= 0; i--) {
                if (!zomEnemies[i]) continue;
                const z = zomEnemies[i];
                const dx = player.x - z.x; const dy = player.y - z.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (player.width / 2 + z.width / 2) * 0.70) {
                    // console.log("Colisión Jugador vs Zom"); // Descomentar para depurar
                    hitPlayer();
                    hitDetected = true;
                    break; // Salir del bucle de Zoms
                }
            }
        }

        // b) Jugador vs Cuerpo del Jefe
        if (!hitDetected && boss && (boss.state === 'fighting' || boss.state === 'entering')) {
            const dx = player.x - boss.x; const dy = player.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (player.width / 2 + boss.width / 2) * 0.65) {
                hitPlayer();
                hitDetected = true;
            }
        }

        // c) Jugador vs Láseres del Jefe
        if (!hitDetected) {
            for (let i = bossLasers.length - 1; i >= 0; i--) {
                if (!bossLasers[i]) continue;
                const l = bossLasers[i];
                const dx = player.x - l.x; const dy = player.y - l.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (player.width / 2 + l.width / 2) * 0.75) {
                    bossLasers.splice(i, 1);
                    hitPlayer();
                    hitDetected = true; // Aunque hitPlayer ya pone invencible, la bandera evita seguir comprobando
                    break; // Salir del bucle de láseres del jefe
                }
            }
        }
    }
}

// Se llama cuando el jugador recibe daño
function hitPlayer() {
    if (player.invincible && player.invincibilityTimer > 0) return; // Ya invencible

    lives--;
    updateScoreAndLevel(); // Actualizar UI

    if (lives <= 0) {
        gameOver("¡HAS PERDIDO!");
        return;
    }

    // Efecto de "limpieza" alrededor del jugador
    const centerX = player.x; const centerY = player.y;
    const clearRadius = player.width * 2.5;
    let enemiesCleared = 0, bossLasersCleared = 0, zomsCleared = 0;

    enemies = enemies.filter(e => {
        const dx = e.x - centerX; const dy = e.y - centerY;
        const shouldKeep = Math.sqrt(dx*dx + dy*dy) >= clearRadius;
        if (!shouldKeep) enemiesCleared++;
        return shouldKeep;
    });
    zomEnemies = zomEnemies.filter(z => {
        const dx = z.x - centerX; const dy = z.y - centerY;
        const shouldKeep = Math.sqrt(dx*dx + dy*dy) >= clearRadius;
        if (!shouldKeep) zomsCleared++;
        return shouldKeep;
    });
    bossLasers = bossLasers.filter(l => {
         const dx = l.x - centerX; const dy = l.y - centerY;
        const shouldKeep = Math.sqrt(dx*dx + dy*dy) >= clearRadius * 1.5; // Radio mayor para láseres
        if (!shouldKeep) bossLasersCleared++;
        return shouldKeep;
    });

    // Reposicionar al jugador y activar invencibilidad
    player.x = canvas.width / 2; player.y = canvas.height / 2;
    player.vx = 0; player.vy = 0;
    player.angle = -Math.PI / 2;
    player.invincible = true;
    player.invincibilityTimer = INVINCIBILITY_DURATION;

    console.log(`Golpe! Vidas: ${lives}. ${enemiesCleared} norm / ${zomsCleared} zom / ${bossLasersCleared} lás. elim. Invencible ${INVINCIBILITY_DURATION}ms.`);
}

// Aplica el efecto de un power-up
function applyPowerUp(type) {
    if (type === 'fast_shot') { // Vida Extra (man.png)
        lives = Math.min(lives + 1, INITIAL_LIVES + 2); // Limitar vidas máx
        updateScoreAndLevel();
        console.log("Vida extra!");
        // Podrías añadir un sonido específico
    } else if (type === 'clear_screen') { // Limpiar normales (luc.png)
        score += enemies.length * POINTS_PER_ENEMY;
        enemies = []; // Vaciar SOLO enemigos normales
        playSound(kapumSound);
        updateScoreAndLevel();
        console.log("Pantalla despejada (enemigos normales)!");
    }
}

// Actualiza UI y maneja subida de nivel
function updateScoreAndLevel() {
    // Actualizar textos directos (los estilos y prefijos están en CSS)
    scoreDisplay.textContent = `Puntaje: ${score}`;
    livesDisplay.textContent = `Vidas: ${lives}`;
    levelDisplay.textContent = `Nivel: ${level}`; // Mostrar nivel actual siempre

    const previousLevel = level;
    const pointsPerLevel = 20;
    const newLevel = Math.max(1, Math.floor(score / pointsPerLevel) + 1);

    if (newLevel > previousLevel) {
        level = newLevel; // Actualizar nivel interno
        console.log(`Nivel ${level} alcanzado!`);
        levelDisplay.textContent = `Nivel: ${level}`; // Actualizar UI
        playSound(newStageSound);

        enemySpawnRate = Math.max(30, ENEMY_SPAWN_RATE_INITIAL * Math.pow(ENEMY_SPAWN_RATE_INCREASE, level - 1));
        console.log(`Spawn Rate (normal): ${enemySpawnRate.toFixed(1)} frames`);

        // Resetear y programar Zoms para el nuevo nivel
        zomsSpawnedThisLevel = 0; // Resetear contador al subir nivel

        if (!boss || boss.state === 'leaving') {
             scheduleLevelZoms(); // Programar Zoms para el nuevo nivel
        } else {
            console.log(`Jefe activo, Zoms del nivel ${level} se programarán al derrotarlo.`);
            // La lógica para generar Zoms pendientes está en bossDefeated()
        }
    }
}


// --- Funciones de Dibujo ---

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle + Math.PI / 2);
    let alpha = 1.0;
    if (player.invincible) {
        const blinkRate = 100;
        if (Math.floor(Date.now() / blinkRate) % 2 === 0) {
            alpha = 0.4;
        }
    }
    ctx.globalAlpha = alpha;
    try {
        if (playerImg.complete && playerImg.naturalWidth > 0) {
             ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
        } else {
             ctx.fillStyle = "blue";
             ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        }
    } catch (e) { console.error("Error dibujando jugador:", e); }
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

function drawLasers() {
    lasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle + Math.PI / 2);
        ctx.fillStyle = "lime";
        ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height);
        ctx.restore();
    });
}

function drawNormalEnemies() {
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
         try {
            if (e.image && e.image.complete && e.image.naturalWidth > 0) {
                 ctx.drawImage(e.image, -e.width / 2, -e.height / 2, e.width, e.height);
            } else {
                 ctx.fillStyle = "red";
                 ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
            }
         } catch(err) { console.error(`Error dibujando enemigo ${e.type}:`, err); }
        ctx.restore();
    });
}

function drawZomEnemies() {
    zomEnemies.forEach(z => {
        ctx.save();
        ctx.translate(z.x, z.y);
         try {
            if (zomImg.complete && zomImg.naturalWidth > 0) {
                 ctx.drawImage(zomImg, -z.width / 2, -z.height / 2, z.width, z.height);
            } else {
                 ctx.fillStyle = "orange";
                 ctx.fillRect(-z.width / 2, -z.height / 2, z.width, z.height);
            }
         } catch(err) { console.error(`Error dibujando enemigo Zom:`, err); }
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
                 ctx.fillStyle = "cyan";
                 ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
             }
         } catch(err) { console.error(`Error dibujando powerup ${p.type}:`, err); }
        ctx.restore();
    });
}

// Dibuja la UI del Jefe (Barra de vida y nombre) - REUBICADA y MEJORADA
function drawBossUI() {
    if (boss && (boss.state === 'fighting' || boss.state === 'entering' || boss.state === 'dying')) {
        const barWidth = canvas.width * 0.4; // Ancho barra
        const barHeight = 25; // Alto barra (un poco más alta)
        const padding = 15; // Espacio desde bordes

        // Calcular posición en esquina INFERIOR IZQUIERDA
        const barX = padding; // X = padding desde la izquierda
        const barY = canvas.height - barHeight - padding; // Y = altura total - alto barra - padding

        const healthPercent = Math.max(0, boss.health / boss.maxHealth);

        // Dibujar Nombre del Jefe (alineado a la izquierda, encima de la barra)
        ctx.fillStyle = "white";
        ctx.font = "bold 18px 'Courier New', Courier, monospace"; // Fuente Tech
        ctx.textAlign = "left"; // Alinear texto a la izquierda
        ctx.textBaseline = "bottom"; // Alinear por la parte inferior del texto
        // Sombra para el texto del nombre
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(`JEFE MOMO Nv. ${boss.level}`, barX, barY - 5); // Posición X=barX, Y justo encima
        // Resetear sombra antes de dibujar la barra
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

        // Dibujar fondo de la barra de vida (rojo oscuro)
        ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Dibujar la vida actual (verde brillante con gradiente)
        const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.9)');   // Verde más brillante arriba
        gradient.addColorStop(0.5, 'rgba(0, 200, 0, 0.9)'); // Verde más oscuro en medio
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0.9)');   // Verde más brillante abajo
        ctx.fillStyle = gradient;
        // Dibujar la barra de vida interior con un pequeño margen para el borde
        if (healthPercent > 0) {
             ctx.fillRect(barX + 1, barY + 1, Math.max(0, (barWidth - 2) * healthPercent), barHeight - 2);
        }

        // Dibujar borde de la barra (blanco)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2; // Borde un poco más grueso
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Dibujar texto de vida (numérico) DENTRO de la barra
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Añadir sombra al texto de vida para contraste
        ctx.shadowColor = "black";
        ctx.shadowBlur = 2; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
        ctx.fillText(`${boss.health} / ${boss.maxHealth}`, barX + barWidth / 2, barY + barHeight / 2 + 1); // +1 para centrar mejor
        // Resetear sombra y alineación
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "start"; // Restaurar alineación izquierda por defecto
    }
}


function drawBoss() {
    if (!boss) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);

    let activeFilter = 'none';
    if (boss.hitTimer > 0) {
        activeFilter = 'brightness(2.5)'; // Efecto golpe
    }
    ctx.filter = activeFilter;

    let dyingAlpha = 1.0;
    if (boss.state === 'dying') {
        if (Math.floor(Date.now() / 80) % 2 === 0) {
            dyingAlpha = 0.3; // Parpadeo al morir
        }
    }
    ctx.globalAlpha = dyingAlpha;

     try {
         if (boss.image && boss.image.complete && boss.image.naturalWidth > 0) {
             ctx.drawImage(boss.image, -boss.width / 2, -boss.height / 2, boss.width, boss.height);
         } else {
             ctx.fillStyle = "purple"; // Fallback
             ctx.fillRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height);
         }
     } catch(err) { console.error("Error dibujando jefe:", err); }

    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

function drawBossLasers() {
    bossLasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle + Math.PI / 2);
        ctx.fillStyle = l.color || "yellow";
        ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height);
        ctx.restore();
    });
}

// --- Bucle Principal y Gestión del Juego ---

function gameLoop() {
    if (!gameRunning) {
        // console.log("gameLoop detenido."); // Descomentar si se necesita depurar paradas inesperadas
        return;
    }

    // 1. Actualizar Estado
    updatePlayer();
    updateLasers();
    updateNormalEnemies();
    updateZomEnemies();
    updatePowerUps();
    updateBoss();
    updateBossLasers();

    // 2. Comprobar Colisiones
    checkCollisions();

    // 3. Dibujar (si el juego sigue corriendo)
    if (gameRunning) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar fondo (con fallback)
        try {
             if (bgImg.complete && bgImg.naturalWidth > 0) {
                 ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
             } else {
                 ctx.fillStyle = "#000011"; // Fondo oscuro si falla
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
             }
        } catch (e) {
            console.error("Error dibujando fondo:", e);
             ctx.fillStyle = "#000011";
             ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Dibujar elementos
        drawNormalEnemies();
        drawZomEnemies();
        drawPowerUps();
        drawLasers();
        drawBossLasers();
        drawBoss();
        drawPlayer(); // Jugador encima de casi todo

        // Dibujar UI del jefe (encima de todo excepto mensajes finales)
        drawBossUI();

        // 4. Siguiente frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    if (gameRunning) return;
    console.log("Starting game...");

    // Resetear estado completo
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    enemyKillCount = 0;
    zomsSpawnedThisLevel = 0; // Resetear contador Zom
    lasers = [];
    enemies = [];
    zomEnemies = [];
    powerUps = [];
    keys = {};
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
    boss = null;
    bossLasers = [];

    // Resetear jugador
    player = {
        x: canvas.width / 2, y: canvas.height / 2,
        width: PLAYER_SIZE, height: PLAYER_SIZE,
        angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18,
        fireRateBoostTimer: 0,
        invincible: true, // Invencibilidad inicial
        invincibilityTimer: INVINCIBILITY_DURATION
    };

    updateScoreAndLevel(); // UI inicial

    gameRunning = true;
    startButton.style.display = 'none';
    instructionsDiv.style.display = 'none';

    // Música
    bossMusic.pause(); bossMusic.currentTime = 0;
    bgMusic.volume = 0.2; bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.warn("Música de fondo requiere interacción."));

    // Programar Zoms Nivel 1
    scheduleLevelZoms(); // Llama a la función que intenta generar los 2 Zoms

    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    console.log("Game loop requested.");
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    if (!gameRunning) return;
    console.log(`Game Over: ${message}`);
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bossMusic.pause();

    setTimeout(() => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"; ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "20px Arial";
        ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);
        startButton.textContent = "Jugar de Nuevo";
        startButton.style.display = 'block';
        instructionsDiv.style.display = 'block';
    }, 50);
}

// --- Inicialización ---
startButton.addEventListener('click', startGame);

function showInitialScreen() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    try {
        if (bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        }
    } catch (e) { console.error("Error dibujando imagen de fondo inicial:", e); }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(canvas.width * 0.1, canvas.height * 0.3, canvas.width * 0.8, canvas.height * 0.4);
    ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDES INFINITO', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('¡Momo y Zoms acechan!', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('Pulsa "Iniciar Juego"', canvas.width / 2, canvas.height / 2 + 40);
    startButton.textContent = "Iniciar Juego";
    startButton.style.display = 'block';
    instructionsDiv.style.display = 'block';
}

// Esperar a que las imágenes ESENCIALES carguen
let essentialImagesCheck = setInterval(() => {
    let loaded = 0;
    if (playerImg.complete && playerImg.naturalWidth > 0) loaded++;
    if (bgImg.complete && bgImg.naturalWidth > 0) loaded++;
    if (bossImg.complete && bossImg.naturalWidth > 0) loaded++;
    if (zomImg.complete && zomImg.naturalWidth > 0) loaded++; // Zom es esencial

    if (loaded >= 4) { // Esperar a las 4 clave
        clearInterval(essentialImagesCheck);
        if (!gameRunning) { showInitialScreen(); }
    }
}, 100);

// Fallback por si tarda mucho
setTimeout(() => {
     clearInterval(essentialImagesCheck);
     if (!gameRunning && imagesLoadedCount < totalImagesToLoad) {
         console.warn("Fallback: Algunas imágenes no cargaron a tiempo, mostrando pantalla inicial.");
         showInitialScreen();
     }
}, 7000);