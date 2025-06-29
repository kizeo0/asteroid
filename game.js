// ========================================================================= //
//                                                                           //
//   CONTENIDO COMPLETO DE game.js (con Pausa, Ajustes y Cambio de Fase)     //
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
const gameTitle = document.getElementById('game-title'); 

// --- Referencias a Elementos de UI/Ajustes ---
const settingsButton = document.getElementById('settings-button');
const pauseButton = document.getElementById('pause-button');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = document.getElementById('close-settings-button');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
const musicVolumeLabel = document.getElementById('music-volume-label');
const sfxVolumeLabel = document.getElementById('sfx-volume-label');

// --- Referencias a Botones Táctiles ---
const dpadUp = document.getElementById('dpad-up');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const shootButton = document.getElementById('shoot-button');
const parryButton = document.getElementById('parry-button');

// --- Recursos de Imagen ---
const playerImg = new Image(); playerImg.src = 'pla.png';
const bgImg = new Image(); bgImg.src = 'fondo.png';
const enemyImages = { lex: new Image(), mau: new Image() };
enemyImages.lex.src = 'lex.png'; enemyImages.mau.src = 'mau.png';
const powerUpImages = { fast_shot: new Image(), clear_screen: new Image() };
powerUpImages.fast_shot.src = 'man.png';
powerUpImages.clear_screen.src = 'luc.png';
const bossImg = new Image(); bossImg.src = 'momo.png';
const zomImg = new Image(); zomImg.src = 'zom.png';
const bgMadelineImg = new Image(); bgMadelineImg.src = 'madeline/fondo_madeline.png';
const cobraImg = new Image(); cobraImg.src = 'madeline/cobra.png';
const balaCobraImg = new Image(); balaCobraImg.src = 'madeline/balacobra.png';
const grenadeImg = new Image(); grenadeImg.src = 'madeline/river.png';


// --- Sonidos ---
const bgMusic = document.getElementById('bgMusic');
const shotSound = document.getElementById('shotSound');
const killSound = document.getElementById('killSound');
const newStageSound = document.getElementById('newStageSound');
const momoSound1 = document.getElementById('momoSound1');
const momoSound2 = document.getElementById('momoSound2');
const bossMusic = document.getElementById('bossMusic');
const kapumSound = document.getElementById('kapumSound');
const zomSound = document.getElementById('zomSound');
const transitionVideo = document.getElementById('transitionVideo');
const madelineMusic = document.getElementById('madelineMusic');
const cobraSounds = [ document.getElementById('cobraSound1'), document.getElementById('cobraSound2'), document.getElementById('cobraSound3') ];
const grenadeSound = document.getElementById('grenadeSound');


// --- Configuración del Juego ---
const PLAYER_SIZE = 80; const ENEMY_SIZE = 70; const ZOM_SIZE = 75; const POWERUP_SIZE = 60;
const LASER_SPEED = 6; const PLAYER_TURN_SPEED = 0.09; const PLAYER_THRUST = 0.1; const FRICTION = 0.99;
const ENEMY_SPEED_MIN = 0.3; const ENEMY_SPEED_MAX = 1.0; const ZOM_SPEED = 2.8;
const POINTS_PER_ENEMY = 1; const POINTS_PER_ZOM = 5; const POWERUP_CHANCE = 0.0015;
const POWERUP_DURATION = 8000; const RARE_POWERUP_CHANCE_MOD = 0.4;
const ENEMY_SPAWN_RATE_INITIAL = 180; const ENEMY_SPAWN_RATE_INCREASE = 0.975;
const INITIAL_LIVES = 3; const INVINCIBILITY_DURATION = 3500; const MAX_ZOMS_PER_LEVEL = 2;
// Habilidad especial
const PARRY_DURATION = 15; const PARRY_COOLDOWN_TIME = 0;
const GRENADE_COOLDOWN = 420;
const GRENADE_SPEED = 4;
const GRENADE_SIZE = 87;
const GRENADE_DAMAGE = 3;
// Config Jefes
const BOSS_BASE_SIZE = 200; const BOSS_BASE_HEALTH = 12; const BOSS_LASER_SPEED = 4.5;
const BOSS_SHOOT_INTERVAL_BASE = 180; const BOSS_SOUND_INTERVAL = 240;
const BOSS_POINTS_DEFEAT_BASE = 100; const BOSS_KILL_THRESHOLD = 10;
const COBRA_SIZE = 200; const COBRA_HEALTH = BOSS_BASE_HEALTH * 2;
const COBRA_SHOOT_INTERVAL = 120;
const COBRA_PROJECTILE_SPEED = 5;
const COBRA_ENTRY_SPEED = 0.5;
const COBRA_VERTICAL_SPEED = 1.5;

// --- Variables de Estado del Juego ---
let score = 0; let level = 1; let lives = INITIAL_LIVES;
let gameCycle = 1;
let gameRunning = false; let isPaused = false;
let isPlayerLocked = false;
let animationFrameId; let enemySpawnCounter = 0;
let enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL; let enemyKillCount = 0;
let zomsSpawnedThisLevel = 0; let musicVolume = 0.2; let sfxVolume = 0.5;
let player = {}; let lasers = []; let enemies = []; let zomEnemies = [];
let powerUps = []; let keys = {}; let boss = null; let bossLasers = [];
let cobraProjectiles = [];
let grenades = [];
let gamePhase = 'momo';


// --- LÓGICA DE AJUSTES Y SONIDO ---
function setMusicVolume(level, fromSlider = false) { musicVolume = level; bgMusic.volume = musicVolume; bossMusic.volume = musicVolume; madelineMusic.volume = musicVolume; if (fromSlider) { localStorage.setItem('musicVolume', musicVolume); } }
function setSfxVolume(level, fromSlider = false) { sfxVolume = level; if (fromSlider) { localStorage.setItem('sfxVolume', sfxVolume); } }
function playSound(sound) { if (!sound) return; const clone = sound.cloneNode(); clone.volume = sfxVolume; clone.play().catch(e => { if (!e.message.includes("user interaction")) { console.warn(`Error de sonido: ${e.message}`); } }); }
function loadSettings() { const savedMusicVol = localStorage.getItem('musicVolume'); const savedSfxVol = localStorage.getItem('sfxVolume'); if (savedMusicVol !== null) { const vol = parseFloat(savedMusicVol); setMusicVolume(vol); musicVolumeSlider.value = vol * 100; musicVolumeLabel.textContent = Math.round(vol * 100); } if (savedSfxVol !== null) { const vol = parseFloat(savedSfxVol); setSfxVolume(vol); sfxVolumeSlider.value = vol * 100; sfxVolumeLabel.textContent = Math.round(vol * 100); } }

// --- LÓGICA DE PAUSA ---
function togglePause() { if (!gameRunning) return; isPaused = !isPaused; if (isPaused) { cancelAnimationFrame(animationFrameId); if (boss && boss.type === 'momo') { bossMusic.pause(); } else if (gamePhase === 'momo') { bgMusic.pause(); } else { madelineMusic.pause(); } drawPauseScreen(); } else { if (boss && boss.type === 'momo') { bossMusic.play(); } else if (gamePhase === 'momo') { bgMusic.play(); } else { madelineMusic.play(); } animationFrameId = requestAnimationFrame(gameLoop); } }
function drawPauseScreen() { ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "white"; ctx.font = "bold 50px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "#0f0"; ctx.shadowBlur = 15; ctx.fillText("PAUSA", canvas.width / 2, canvas.height / 2); ctx.shadowBlur = 0; ctx.textAlign = "start"; ctx.textBaseline = "alphabetic"; }

// --- LÓGICA DEL JUGADOR ---
document.addEventListener('keydown', (e) => { if (e.code === 'KeyP') { togglePause(); } keys[e.code] = true; if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ'].includes(e.code)) { e.preventDefault(); } });
document.addEventListener('keyup', (e) => { if (keys[e.code] === true) { keys[e.code] = false; } });
function handleTouchStart(e, keyCode) { e.preventDefault(); keys[keyCode] = true; }
function handleTouchEnd(e, keyCode) { e.preventDefault(); keys[keyCode] = false; }
[{el: dpadUp, key: 'ArrowUp'}, {el: dpadLeft, key: 'ArrowLeft'}, {el: dpadRight, key: 'ArrowRight'}, {el: shootButton, key: 'Space'}, {el: parryButton, key: 'KeyZ'}].forEach(item => { item.el.addEventListener('touchstart', (e) => handleTouchStart(e, item.key), { passive: false }); item.el.addEventListener('touchend', (e) => handleTouchEnd(e, item.key), { passive: false }); item.el.addEventListener('mousedown', (e) => handleTouchStart(e, item.key), { passive: false }); item.el.addEventListener('mouseup', (e) => handleTouchEnd(e, item.key), { passive: false }); item.el.addEventListener('touchcancel', (e) => handleTouchEnd(e, item.key), { passive: false }); });

function wrapAround(obj) { const w = canvas.width, h = canvas.height; const hw = obj.width / 2, hh = obj.height / 2; if (obj.x < -hw) obj.x = w + hw; if (obj.x > w + hw) obj.x = -hw; if (obj.y < -hh) obj.y = h + hh; if (obj.y > h + hh) obj.y = -hh; }

// **** CORREGIDO: Se ha restaurado la línea que actualiza el ángulo del jugador ****
function updatePlayer() {
    player.rotation = keys['ArrowLeft'] && !isPlayerLocked ? -PLAYER_TURN_SPEED : (keys['ArrowRight'] && !isPlayerLocked ? PLAYER_TURN_SPEED : 0);
    player.angle += player.rotation; // <-- ESTA LÍNEA SE HA RESTAURADO
    
    player.thrusting = keys['ArrowUp'] && !isPlayerLocked;
    
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
    
    if (keys['Space'] && player.shootCooldown <= 0 && !player.parryActive && !isPlayerLocked) { 
        shootLaser(); 
        player.shootCooldown = player.currentFireRate; 
    }
    
    if (player.invincible) { 
        player.invincibilityTimer -= 1000 / 60; 
        if (player.invincibilityTimer <= 0) { 
            player.invincible = false; 
        } 
    }

    if (gamePhase === 'madeline') {
        if (player.grenadeCooldown > 0) player.grenadeCooldown--;
        if (keys['KeyZ'] && player.grenadeCooldown <= 0 && !isPlayerLocked) {
            shootGrenade();
        }
    } else {
        if (player.parryCooldown > 0) player.parryCooldown--;
        if (player.parryTimer > 0) { 
            player.parryTimer--; 
        } else if (player.parryActive) { 
            player.parryActive = false; 
        }
        if (keys['KeyZ'] && player.parryCooldown <= 0 && !isPlayerLocked) { 
            player.parryActive = true; 
            player.parryTimer = PARRY_DURATION; 
            player.parryCooldown = PARRY_COOLDOWN_TIME; 
        }
    }
}
function shootLaser() { const angle = player.angle; const originDist = player.width / 2; const startX = player.x + Math.cos(angle) * originDist; const startY = player.y + Math.sin(angle) * originDist; lasers.push({ x: startX, y: startY, angle: angle, vx: Math.cos(angle) * LASER_SPEED + player.vx * 0.4, vy: Math.sin(angle) * LASER_SPEED + player.vy * 0.4, width: 5, height: 10 }); playSound(shotSound); }
function updateLasers() { for (let i = lasers.length - 1; i >= 0; i--) { const l = lasers[i]; l.x += l.vx; l.y += l.vy; if (l.x < 0 || l.x > canvas.width || l.y < 0 || l.y > canvas.height) { lasers.splice(i, 1); } } }
function shootGrenade() {
    if (player.grenadeCooldown > 0) return;
    const angle = player.angle;
    const originDist = player.width / 2;
    const startX = player.x + Math.cos(angle) * originDist;
    const startY = player.y + Math.sin(angle) * originDist;
    grenades.push({ x: startX, y: startY, vx: Math.cos(angle) * GRENADE_SPEED, vy: Math.sin(angle) * GRENADE_SPEED, width: GRENADE_SIZE, height: GRENADE_SIZE, image: grenadeImg, rotation: 0 });
    playSound(grenadeSound);
    player.grenadeCooldown = GRENADE_COOLDOWN;
}
function updateGrenades() { for (let i = grenades.length - 1; i >= 0; i--) { const g = grenades[i]; g.x += g.vx; g.y += g.vy; g.rotation += 0.1; if (g.x < 0 || g.x > canvas.width || g.y < 0 || g.y > canvas.height) { grenades.splice(i, 1); } } }


// --- LÓGICA DE ENEMIGOS Y JEFES ---
function spawnNormalEnemy() { 
    if (gamePhase !== 'momo' || (boss && boss.state !== 'leaving')) return; 
    const difficultyMultiplier = 1 + (gameCycle - 1) * 0.1;
    const type = Math.random() < 0.5 ? 'lex' : 'mau'; 
    const edge = Math.floor(Math.random() * 4); 
    const w = canvas.width, h = canvas.height; 
    const margin = ENEMY_SIZE * 1.5; 
    let x, y; 
    if (edge === 0) { x = Math.random() * w; y = -margin; } 
    else if (edge === 1) { x = w + margin; y = Math.random() * h; } 
    else if (edge === 2) { x = Math.random() * w; y = h + margin; } 
    else { x = -margin; y = Math.random() * h; } 
    const angleToCenter = Math.atan2(h / 2 - y, w / 2 - x); 
    const angleVariation = (Math.random() - 0.5) * (Math.PI / 2); 
    const angle = angleToCenter + angleVariation; 
    const speed = (ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + (level * 0.08)) * difficultyMultiplier; 
    enemies.push({ x: x, y: y, width: ENEMY_SIZE, height: ENEMY_SIZE, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, type: type, image: enemyImages[type] }); 
}
function spawnZomEnemy() { if (gamePhase !== 'momo' || (boss && boss.state !== 'leaving')) return false; if (zomsSpawnedThisLevel >= MAX_ZOMS_PER_LEVEL) return false; const edge = Math.floor(Math.random() * 4); const w = canvas.width, h = canvas.height; const margin = ZOM_SIZE * 1.5; let x, y; if (edge === 0) { x = Math.random() * w; y = -margin; } else if (edge === 1) { x = w + margin; y = Math.random() * h; } else if (edge === 2) { x = Math.random() * w; y = h + margin; } else { x = -margin; y = Math.random() * h; } zomEnemies.push({ x: x, y: y, width: ZOM_SIZE, height: ZOM_SIZE, vx: 0, vy: 0, type: 'zom', image: zomImg }); zomsSpawnedThisLevel++; playSound(zomSound); return true; }
function scheduleLevelZoms() { if (gamePhase !== 'momo') return; setTimeout(() => spawnZomEnemy(), 1500); setTimeout(() => spawnZomEnemy(), 3500); }
function updateNormalEnemies() { if (gamePhase !== 'momo') return; if (!boss || boss.state === 'leaving') { enemySpawnCounter++; const maxEnemies = 10 + level; if (enemySpawnCounter >= enemySpawnRate && enemies.length < maxEnemies) { spawnNormalEnemy(); enemySpawnCounter = 0; } } enemies.forEach(e => { e.x += e.vx; e.y += e.vy; wrapAround(e); }); }
function updateZomEnemies() { if (gamePhase !== 'momo') return; zomEnemies.forEach(e => { const dx = player.x - e.x; const dy = player.y - e.y; const angleToPlayer = Math.atan2(dy, dx); e.vx = Math.cos(angleToPlayer) * ZOM_SPEED; e.vy = Math.sin(angleToPlayer) * ZOM_SPEED; e.x += e.vx; e.y += e.vy; wrapAround(e); }); }
function spawnPowerUp() { const padding = POWERUP_SIZE * 1.5; const x = padding + Math.random() * (canvas.width - 2 * padding); const y = padding + Math.random() * (canvas.height - 2 * padding); const type = Math.random() < RARE_POWERUP_CHANCE_MOD ? 'clear_screen' : 'fast_shot'; powerUps.push({ x: x, y: y, width: POWERUP_SIZE, height: POWERUP_SIZE, type: type, image: powerUpImages[type], creationTime: Date.now() }); }
function updatePowerUps() { if (gamePhase === 'momo' && !boss && Math.random() < POWERUP_CHANCE && powerUps.length < 3) spawnPowerUp(); const now = Date.now(); for (let i = powerUps.length - 1; i >= 0; i--) { if (now - powerUps[i].creationTime > POWERUP_DURATION) { powerUps.splice(i, 1); } } }
function spawnBoss(bossAppearanceLevel) { 
    if (boss || gamePhase !== 'momo') return; 
    console.log(`¡Aparece el JEFE (Encuentro N. ${bossAppearanceLevel})!`); 
    enemies = []; lasers = []; powerUps = []; zomEnemies = []; 
    zomsSpawnedThisLevel = MAX_ZOMS_PER_LEVEL; 
    bgMusic.pause(); 
    bossMusic.currentTime = 0; 
    bossMusic.play().catch(e => console.warn("Música del jefe necesita interacción del usuario")); 
    const difficultyMultiplier = 1 + (gameCycle - 1) * 0.2;
    const health = (BOSS_BASE_HEALTH + (bossAppearanceLevel - 1) * 8) * difficultyMultiplier; 
    const size = Math.min(canvas.width * 0.4, BOSS_BASE_SIZE + (bossAppearanceLevel - 1) * 5); 
    const shootInterval = Math.max(45, BOSS_SHOOT_INTERVAL_BASE - (bossAppearanceLevel - 1) * 10); 
    const bossSpeedX = (1.0 + (bossAppearanceLevel * 0.15)) * (1 + (gameCycle - 1) * 0.05);
    boss = { x: canvas.width / 2, y: -size, width: size, height: size, vx: bossSpeedX * (Math.random() < 0.5 ? 1 : -1), vy: 1.2, health: health, maxHealth: health, image: bossImg, shootCooldown: shootInterval * 1.5, shootInterval: shootInterval, soundCooldown: BOSS_SOUND_INTERVAL / 2, level: bossAppearanceLevel, state: 'entering', hitTimer: 0, type: 'momo' }; 
}
function spawnCobraBoss() { 
    if (boss) return; 
    console.log("¡Aparece LA COBRA!");
    isPlayerLocked = true;
    const difficultyMultiplier = 1 + (gameCycle - 1) * 0.25;
    const cobraHealth = COBRA_HEALTH * difficultyMultiplier;
    boss = { x: canvas.width + COBRA_SIZE, y: canvas.height / 2, width: COBRA_SIZE, height: COBRA_SIZE, vx: -COBRA_ENTRY_SPEED, vy: 0, health: cobraHealth, maxHealth: cobraHealth, image: cobraImg, shootCooldown: COBRA_SHOOT_INTERVAL * 2, shootInterval: COBRA_SHOOT_INTERVAL, state: 'entering', hitTimer: 0, type: 'cobra' }; 
}
function cobraShoot() { if (!boss || boss.state !== 'fighting') return; const projectile = { x: boss.x - boss.width / 2, y: boss.y, vx: -COBRA_PROJECTILE_SPEED, width: 100, height: 80, image: balaCobraImg }; cobraProjectiles.push(projectile); const randomSound = cobraSounds[Math.floor(Math.random() * cobraSounds.length)]; playSound(randomSound); }
function updateCobraProjectiles() { for (let i = cobraProjectiles.length - 1; i >= 0; i--) { const p = cobraProjectiles[i]; p.x += p.vx; if (p.x + p.width < 0) { cobraProjectiles.splice(i, 1); } } }
function updateBoss() { 
    if (!boss) return; 
    if (boss.hitTimer > 0) boss.hitTimer--; 
    if (boss.type === 'momo') { 
        if (boss.state === 'entering') { 
            boss.y += boss.vy; 
            if (boss.y >= boss.height * 0.4) { 
                boss.y = boss.height * 0.4; 
                boss.vy = 0; 
                boss.state = 'fighting'; 
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
        } else if (boss.state === 'leaving') { 
            boss.y += boss.vy; 
            if (boss.y < -boss.height * 1.5) { 
                bossDefeated(); 
            } 
        } 
    } else if (boss.type === 'cobra') { 
        if (boss.state === 'entering') { 
            boss.x += boss.vx; 
            const targetX = canvas.width - boss.width / 2; 
            if (boss.x <= targetX) { 
                boss.x = targetX; 
                boss.vx = 0; 
                boss.vy = COBRA_VERTICAL_SPEED; 
                boss.state = 'fighting'; 
                isPlayerLocked = false;
            } 
        } else if (boss.state === 'fighting') { 
            boss.y += boss.vy; 
            if (boss.y - boss.height / 2 < 0 || boss.y + boss.height / 2 > canvas.height) { 
                boss.vy *= -1; 
            } 
            boss.shootCooldown--; 
            if (boss.shootCooldown <= 0) { 
                cobraShoot(); 
                boss.shootCooldown = boss.shootInterval; 
            } 
        } 
    } 
}
function bossShoot() { if (!boss || boss.state !== 'fighting') return; const playerEffectiveY = player.y - player.height / 2; const bossFireY = boss.y + boss.height * 0.4; const angleToPlayer = Math.atan2(playerEffectiveY - bossFireY, player.x - boss.x); const baseSpeed = BOSS_LASER_SPEED + boss.level * 0.1; bossLasers.push({ x: boss.x, y: bossFireY, angle: angleToPlayer, vx: Math.cos(angleToPlayer) * baseSpeed, vy: Math.sin(angleToPlayer) * baseSpeed, width: 8, height: 15, color: 'yellow' }); if (boss.level >= 2) { const spreadAngle = Math.PI / 15; for (let i = -1; i <= 1; i += 2) { const currentAngle = angleToPlayer + i * spreadAngle; bossLasers.push({ x: boss.x, y: bossFireY, angle: currentAngle, vx: Math.cos(currentAngle) * baseSpeed * 0.9, vy: Math.sin(currentAngle) * baseSpeed * 0.9, width: 7, height: 13, color: '#FFA500' }); } } if (boss.level >= 4) { const shoulderOffset = boss.width * 0.3; const sideAngleOffset = Math.PI / 10; bossLasers.push({ x: boss.x - shoulderOffset, y: boss.y + boss.height * 0.2, angle: angleToPlayer + sideAngleOffset, vx: Math.cos(angleToPlayer + sideAngleOffset) * baseSpeed * 0.8, vy: Math.sin(angleToPlayer + sideAngleOffset) * baseSpeed * 0.8, width: 6, height: 12, color: 'pink' }); bossLasers.push({ x: boss.x + shoulderOffset, y: boss.y + boss.height * 0.2, angle: angleToPlayer - sideAngleOffset, vx: Math.cos(angleToPlayer - sideAngleOffset) * baseSpeed * 0.8, vy: Math.sin(angleToPlayer - sideAngleOffset) * baseSpeed * 0.8, width: 6, height: 12, color: 'pink' }); } }
function updateBossLasers() { for (let i = bossLasers.length - 1; i >= 0; i--) { const l = bossLasers[i]; l.x += l.vx; l.y += l.vy; if (l.x < -l.width * 2 || l.x > canvas.width + l.width * 2 || l.y < -l.height * 2 || l.y > canvas.height + l.height * 2) { bossLasers.splice(i, 1); } } }
function bossDefeated() { boss = null; bossLasers = []; bossMusic.pause(); bgMusic.currentTime = 0; bgMusic.play().catch(e => console.warn("Música normal necesita interacción")); enemySpawnRate = Math.max(30, ENEMY_SPAWN_RATE_INITIAL * Math.pow(ENEMY_SPAWN_RATE_INCREASE, level - 1)); enemySpawnCounter = enemySpawnRate; spawnPowerUp(); if (zomsSpawnedThisLevel < MAX_ZOMS_PER_LEVEL && gamePhase === 'momo') { scheduleLevelZoms(); } }

// --- FASES Y TRANSICIONES ---
function startMadelineTransition() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause(); bossMusic.pause();
    transitionVideo.style.display = 'block';
    transitionVideo.currentTime = 0;
    transitionVideo.play();
    transitionVideo.onended = () => {
        transitionVideo.style.display = 'none'; 
        gamePhase = 'madeline';
        document.body.classList.add('madeline-theme');
        gameTitle.textContent = "Mundo Interior"; 
        updateAbilityButtonUI();
        enemies = []; zomEnemies = []; powerUps = []; lasers = []; bossLasers = []; boss = null;
        player.x = canvas.width / 2; player.y = canvas.height / 2; player.vx = 0; player.vy = 0;
        setMusicVolume(musicVolume); 
        madelineMusic.currentTime = 0;
        madelineMusic.play().catch(e => console.warn("Música de Madeline requiere interacción."));
        gameRunning = true; isPaused = false;
        spawnCobraBoss();
        animationFrameId = requestAnimationFrame(gameLoop);
    };
}


// --- LÓGICA DE COLISIONES ---
function checkCollisions() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        if (!lasers[i]) continue;
        const l = lasers[i];
        if (gamePhase === 'momo') {
            for (let j = enemies.length - 1; j >= 0; j--) { if (!enemies[j]) continue; const e = enemies[j]; const dx = l.x - e.x, dy = l.y - e.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (l.height / 2 + e.width / 2) * 0.85) { lasers.splice(i, 1); enemies.splice(j, 1); playSound(killSound); score += POINTS_PER_ENEMY; enemyKillCount++; updateScoreAndLevel(); if (enemyKillCount > 0 && enemyKillCount % BOSS_KILL_THRESHOLD === 0 && (!boss || boss.state === 'leaving')) { const bossAppearanceLevel = Math.floor(enemyKillCount / BOSS_KILL_THRESHOLD); spawnBoss(bossAppearanceLevel); } break; } }
            if (!lasers[i]) continue;
            for (let j = zomEnemies.length - 1; j >= 0; j--) { if (!zomEnemies[j]) continue; const z = zomEnemies[j]; const dx = l.x - z.x, dy = l.y - z.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (l.height / 2 + z.width / 2) * 0.85) { lasers.splice(i, 1); zomEnemies.splice(j, 1); score += POINTS_PER_ZOM; updateScoreAndLevel(); break; } }
        }
    }

    if (boss && boss.state === 'fighting') {
        for (let i = lasers.length - 1; i >= 0; i--) {
            if (!lasers[i]) continue;
            const l = lasers[i];
            const dx = l.x - boss.x, dy = l.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < boss.width / 2 * 0.8) {
                lasers.splice(i, 1);
                boss.health--;
                boss.hitTimer = 5;
                break; 
            }
        }
        for (let i = grenades.length - 1; i >= 0; i--) {
            if (!grenades[i]) continue;
            const g = grenades[i];
            const dx = g.x - boss.x, dy = g.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < boss.width / 2 * 0.8) {
                grenades.splice(i, 1);
                boss.health -= GRENADE_DAMAGE;
                boss.hitTimer = 5;
                break; 
            }
        }

        if (boss.health <= 0) {
            if (boss.type === 'momo') {
                if (boss.level === 2 && gamePhase === 'momo') { startMadelineTransition(); return; } 
                else { playSound(killSound); score += BOSS_POINTS_DEFEAT_BASE * boss.level; updateScoreAndLevel(); boss.state = 'dying'; boss.vx = 0; setTimeout(() => { if (boss && boss.state === 'dying') { boss.state = 'leaving'; boss.vy = -2; bossLasers = []; } }, 1500); }
            } else if (boss.type === 'cobra') {
                playSound(killSound); 
                score += 500; 
                updateScoreAndLevel();
                boss.state = 'dying';
                gameCycle++;

                setTimeout(() => {
                    gameRunning = false;
                    cancelAnimationFrame(animationFrameId);
                    madelineMusic.pause();
                    pauseButton.style.display = 'none';

                    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = "white";
                    ctx.font = "bold 30px 'Courier New', monospace";
                    ctx.textAlign = "center";
                    ctx.fillText(`¡CICLO ${gameCycle - 1} COMPLETADO!`, canvas.width / 2, canvas.height / 2 - 20);
                    ctx.font = "20px 'Courier New', monospace";
                    ctx.fillText("Preparando siguiente ciclo...", canvas.width / 2, canvas.height / 2 + 20);
                    
                    setTimeout(startGame, 4000);
                }, 2000);
            }
        }
    }
    
    for (let i = powerUps.length - 1; i >= 0; i--) { if (!powerUps[i]) continue; const p = powerUps[i]; const dx = player.x - p.x, dy = player.y - p.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (player.width / 2 + p.width / 2) * 0.9) { applyPowerUp(p.type); powerUps.splice(i, 1); } }
    if (player.parryActive && boss && bossLasers.length > 0) { const parryRadius = player.width / 2 * 1.5; for (let i = bossLasers.length - 1; i >= 0; i--) { const l = bossLasers[i]; const dx = player.x - l.x, dy = player.y - l.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (parryRadius + l.width / 2)) { bossLasers.splice(i, 1); console.log("¡Parry exitoso!"); player.parryActive = false; player.parryTimer = 0; break; } } }
    if (!player.invincible) {
        let hitDetected = false;
        if (gamePhase === 'momo') {
             for (let i = enemies.length - 1; i >= 0; i--) { if (!enemies[i]) continue; const e = enemies[i]; const dx = player.x - e.x, dy = player.y - e.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (player.width / 2 + e.width / 2) * 0.70) { hitPlayer(); hitDetected = true; break; } }
             if (!hitDetected) { 
                for (let i = zomEnemies.length - 1; i >= 0; i--) { 
                    if (!zomEnemies[i]) continue; 
                    const z = zomEnemies[i]; 
                    const dx = player.x - z.x, dy = player.y - z.y; 
                    const dist = Math.sqrt(dx * dx + dy * dy); 
                    if (dist < (player.width / 2 + z.width / 2) * 0.70) { 
                        hitPlayer(); 
                        hitDetected = true; 
                        break; 
                    } 
                } 
            }
        }
        if (!hitDetected && boss && (boss.state === 'fighting' || boss.state === 'entering')) { const dx = player.x - boss.x; const dy = player.y - boss.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (player.width / 2 + boss.width / 2) * 0.65) { hitPlayer(); hitDetected = true; } }
        if (!hitDetected) { for (let i = bossLasers.length - 1; i >= 0; i--) { if (!bossLasers[i]) continue; const l = bossLasers[i]; const dx = player.x - l.x, dy = player.y - l.y; const dist = Math.sqrt(dx * dx + dy * dy); if (dist < (player.width / 2 + l.width / 2) * 0.75) { bossLasers.splice(i, 1); hitPlayer(); hitDetected = true; break; } } }
        if (!hitDetected) { for (let i = cobraProjectiles.length - 1; i >= 0; i--) { if (!cobraProjectiles[i]) continue; const p = cobraProjectiles[i]; const dx = player.x - p.x, dy = player.y - p.y; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < (player.width/2 + p.width/2) * 0.75) { cobraProjectiles.splice(i, 1); hitPlayer(); hitDetected = true; break; } } }
    }
}
function hitPlayer() { if (player.invincible && player.invincibilityTimer > 0) return; lives--; updateScoreAndLevel(); if (lives <= 0) { gameOver("¡HAS PERDIDO!"); return; } const centerX = player.x; const centerY = player.y; const clearRadius = player.width * 2.5; enemies = enemies.filter(e => Math.sqrt(Math.pow(e.x - centerX, 2) + Math.pow(e.y - centerY, 2)) >= clearRadius); zomEnemies = zomEnemies.filter(z => Math.sqrt(Math.pow(z.x - centerX, 2) + Math.pow(z.y - centerY, 2)) >= clearRadius); bossLasers = bossLasers.filter(l => Math.sqrt(Math.pow(l.x - centerX, 2) + Math.pow(l.y - centerY, 2)) >= clearRadius * 1.5); cobraProjectiles = cobraProjectiles.filter(p => Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)) >= clearRadius); player.x = canvas.width / 2; player.y = canvas.height / 2; player.vx = 0; player.vy = 0; player.angle = -Math.PI / 2; player.invincible = true; player.invincibilityTimer = INVINCIBILITY_DURATION; }
function applyPowerUp(type) { if (type === 'fast_shot') { lives = Math.min(lives + 1, INITIAL_LIVES + 2); updateScoreAndLevel(); } else if (type === 'clear_screen') { score += enemies.length * POINTS_PER_ENEMY; enemies = []; playSound(kapumSound); updateScoreAndLevel(); } }
function updateScoreAndLevel() { scoreDisplay.textContent = `Puntaje: ${score}`; livesDisplay.textContent = `Vidas: ${lives}`; levelDisplay.textContent = `Nivel: ${level}`; const previousLevel = level; const pointsPerLevel = 20; const newLevel = Math.max(1, Math.floor(score / pointsPerLevel) + 1); if (newLevel > previousLevel) { level = newLevel; levelDisplay.textContent = `Nivel: ${level}`; playSound(newStageSound); enemySpawnRate = Math.max(30, ENEMY_SPAWN_RATE_INITIAL * Math.pow(ENEMY_SPAWN_RATE_INCREASE, level - 1)); zomsSpawnedThisLevel = 0; if (gamePhase === 'momo' && (!boss || boss.state === 'leaving')) { scheduleLevelZoms(); } } }

// --- FUNCIONES DE DIBUJO ---
function drawPlayer() { ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle + Math.PI / 2); let alpha = 1.0; if (player.invincible) { alpha = (Math.floor(Date.now() / 100) % 2 === 0) ? 0.4 : 1.0; } ctx.globalAlpha = alpha; try { if (playerImg.complete && playerImg.naturalWidth > 0) { ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height); } else { ctx.fillStyle = "blue"; ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height); } } catch (e) { console.error("Error dibujando jugador:", e); } ctx.globalAlpha = 1.0; ctx.restore(); }
function drawParryBarrier() { if (gamePhase !== 'momo' || !player.parryActive) return; const alpha = player.parryTimer / PARRY_DURATION; ctx.save(); ctx.translate(player.x, player.y); ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.9})`; ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.2})`; ctx.lineWidth = 2 + (3 * (1 - alpha)); const radius = player.width / 2 * 1.5; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
function drawLasers() { lasers.forEach(l => { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.angle + Math.PI / 2); ctx.fillStyle = "lime"; ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height); ctx.restore(); }); }
function drawGrenades() { grenades.forEach(g => { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rotation); try { if (g.image.complete && g.image.naturalWidth > 0) { ctx.drawImage(g.image, -g.width / 2, -g.height / 2, g.width, g.height); } else { ctx.fillStyle = "brown"; ctx.fillRect(-g.width/2,-g.height/2,g.width,g.height); } } catch(e) { console.error("Error dibujando granada", e); } ctx.restore(); }); }
function drawNormalEnemies() { enemies.forEach(e => { ctx.save(); ctx.translate(e.x, e.y); try { if (e.image && e.image.complete && e.image.naturalWidth > 0) { ctx.drawImage(e.image, -e.width / 2, -e.height / 2, e.width, e.height); } else { ctx.fillStyle = "red"; ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height); } } catch (err) { console.error(`Error dibujando enemigo ${e.type}:`, err); } ctx.restore(); }); }
function drawZomEnemies() { zomEnemies.forEach(z => { ctx.save(); ctx.translate(z.x, z.y); try { if (zomImg.complete && zomImg.naturalWidth > 0) { ctx.drawImage(zomImg, -z.width / 2, -z.height / 2, z.width, z.height); } else { ctx.fillStyle = "orange"; ctx.fillRect(-z.width / 2, -z.height / 2, z.width, z.height); } } catch (err) { console.error(`Error dibujando enemigo Zom:`, err); } ctx.restore(); }); }
function drawPowerUps() { powerUps.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); try { if (p.image && p.image.complete && p.image.naturalWidth > 0) { ctx.drawImage(p.image, -p.width / 2, -p.height / 2, p.width, p.height); } else { ctx.fillStyle = "cyan"; ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height); } } catch (err) { console.error(`Error dibujando powerup ${p.type}:`, err); } ctx.restore(); }); }
function drawBossUI() { if (boss && (boss.state === 'fighting' || boss.state === 'entering' || boss.state === 'dying')) { const barWidth = canvas.width * 0.4; const barHeight = 25; const padding = 15; const barX = padding; const barY = canvas.height - barHeight - padding; const healthPercent = Math.max(0, boss.health / boss.maxHealth); ctx.fillStyle = "white"; ctx.font = "bold 18px 'Courier New', Courier, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.shadowColor = "black"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; const bossName = boss.type === 'momo' ? `JEFE MOMO Nv. ${boss.level} (x${(1 + (gameCycle-1) * 0.2).toFixed(1)})` : `LA COBRA (x${(1 + (gameCycle-1) * 0.25).toFixed(1)})`; ctx.fillText(bossName, barX, barY - 5); ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.fillStyle = 'rgba(100, 0, 0, 0.8)'; ctx.fillRect(barX, barY, barWidth, barHeight); const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight); gradient.addColorStop(0, 'rgba(0, 255, 0, 0.9)'); gradient.addColorStop(0.5, 'rgba(0, 200, 0, 0.9)'); gradient.addColorStop(1, 'rgba(0, 255, 0, 0.9)'); ctx.fillStyle = gradient; if (healthPercent > 0) { ctx.fillRect(barX + 1, barY + 1, Math.max(0, (barWidth - 2) * healthPercent), barHeight - 2); } ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barWidth, barHeight); ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "black"; ctx.shadowBlur = 2; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1; ctx.fillText(`${Math.ceil(boss.health)} / ${Math.ceil(boss.maxHealth)}`, barX + barWidth / 2, barY + barHeight / 2 + 1); ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.textBaseline = "alphabetic"; ctx.textAlign = "start"; } }
function drawBoss() { if (!boss) return; ctx.save(); ctx.translate(boss.x, boss.y); let activeFilter = 'none'; if (boss.hitTimer > 0) { activeFilter = 'brightness(2.5)'; } ctx.filter = activeFilter; let dyingAlpha = 1.0; if (boss.state === 'dying') { if (Math.floor(Date.now() / 80) % 2 === 0) { dyingAlpha = 0.3; } } ctx.globalAlpha = dyingAlpha; try { if (boss.image && boss.image.complete && boss.image.naturalWidth > 0) { ctx.drawImage(boss.image, -boss.width / 2, -boss.height / 2, boss.width, boss.height); } else { ctx.fillStyle = "purple"; ctx.fillRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height); } } catch (err) { console.error("Error dibujando jefe:", err); } ctx.filter = 'none'; ctx.globalAlpha = 1.0; ctx.restore(); }
function drawBossLasers() { bossLasers.forEach(l => { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.angle + Math.PI / 2); ctx.fillStyle = l.color || "yellow"; ctx.fillRect(-l.width / 2, -l.height / 2, l.width, l.height); ctx.restore(); }); }
function drawCobraProjectiles() { cobraProjectiles.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); try { if (p.image && p.image.complete && p.image.naturalWidth > 0) { ctx.drawImage(p.image, -p.width / 2, -p.height / 2, p.width, p.height); } else { ctx.fillStyle = "magenta"; ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height); } } catch(e) { console.error("Error dibujando bala de cobra", e); } ctx.restore(); }); }
function updateAbilityButtonUI() {
    if (!parryButton) return;
    if (gamePhase === 'madeline') {
        parryButton.textContent = 'GRANADA';
        if (player.grenadeCooldown > 0) {
            parryButton.style.opacity = '0.4';
            parryButton.style.cursor = 'not-allowed';
        } else {
            parryButton.style.opacity = '1';
            parryButton.style.cursor = 'pointer';
        }
    } else { 
        parryButton.textContent = 'BARRERA';
        if (player.parryCooldown > 0) {
            parryButton.style.opacity = '0.4';
            parryButton.style.cursor = 'not-allowed';
        } else {
            parryButton.style.opacity = '1';
            parryButton.style.cursor = 'pointer';
        }
    }
}


// --- Bucle Principal y Gestión del Juego ---
function gameLoop() {
    if (!gameRunning) return;
    updatePlayer(); updateLasers(); updateGrenades(); updateNormalEnemies(); updateZomEnemies(); updatePowerUps(); updateBoss(); updateBossLasers(); updateCobraProjectiles(); updateAbilityButtonUI();
    checkCollisions();
    if (gameRunning) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        try { const currentBg = gamePhase === 'momo' ? bgImg : bgMadelineImg; if (currentBg.complete && currentBg.naturalWidth > 0) { ctx.drawImage(currentBg, 0, 0, canvas.width, canvas.height); } else { ctx.fillStyle = "#000011"; ctx.fillRect(0, 0, canvas.width, canvas.height); } } catch (e) { console.error("Error dibujando fondo:", e); ctx.fillStyle = "#000011"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        drawNormalEnemies(); drawZomEnemies(); drawPowerUps(); drawLasers(); drawGrenades();
        drawBossLasers(); drawCobraProjectiles(); drawBoss(); drawPlayer(); drawParryBarrier(); drawBossUI();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    if (gameRunning && !isPaused) return;
    isPaused = false;
    gameRunning = true;
    
    isPlayerLocked = false;

    startButton.style.display = 'none'; instructionsDiv.style.display = 'none';
    settingsButton.style.display = 'none'; pauseButton.style.display = 'flex';

    gamePhase = 'momo';
    document.body.classList.remove('madeline-theme');
    gameTitle.textContent = `Asteroides Infinito (Ciclo ${gameCycle})`;
    updateAbilityButtonUI();
    
    if (gameCycle === 1) {
        score = 0;
    }
    level = 1; 
    lives = INITIAL_LIVES; 
    enemyKillCount = 0;
    zomsSpawnedThisLevel = 0; 
    lasers = []; 
    enemies = []; 
    zomEnemies = [];
    powerUps = []; 
    keys = {}; 
    enemySpawnCounter = 0; 
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;
    boss = null; 
    bossLasers = []; 
    cobraProjectiles = []; 
    grenades = [];

    player = {
        x: canvas.width / 2, y: canvas.height / 2, width: PLAYER_SIZE, height: PLAYER_SIZE,
        angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18, fireRateBoostTimer: 0,
        invincible: true, invincibilityTimer: INVINCIBILITY_DURATION,
        parryActive: false, parryTimer: 0, parryCooldown: 0,
        grenadeCooldown: 0
    };
    updateScoreAndLevel();

    bossMusic.pause(); madelineMusic.pause();
    bossMusic.currentTime = 0; madelineMusic.currentTime = 0;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.warn("Música de fondo requiere interacción."));

    scheduleLevelZoms();
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    if (!gameRunning) return;
    gameCycle = 1;
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause(); bossMusic.pause(); madelineMusic.pause();

    pauseButton.style.display = 'none';
    setTimeout(() => {
        gamePhase = 'momo';
        document.body.classList.remove('madeline-theme');
        gameTitle.textContent = "Asteroides Infinito";
        updateAbilityButtonUI();

        showInitialScreen();
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"; ctx.font = "bold 30px Arial"; ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "20px Arial";
        ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);
        startButton.textContent = "Jugar de Nuevo";
    }, 50);
}

function showInitialScreen() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    try { const currentBg = gamePhase === 'momo' ? bgImg : bgMadelineImg; if (currentBg.complete && currentBg.naturalWidth > 0) { ctx.drawImage(currentBg, 0, 0, canvas.width, canvas.height); } } catch (e) { console.error("Error dibujando imagen de fondo inicial:", e); }
    
    startButton.style.display = 'block'; instructionsDiv.style.display = 'block';
    settingsButton.style.display = 'block'; pauseButton.style.display = 'none';
}

// --- EVENT LISTENERS E INICIALIZACIÓN ---
musicVolumeSlider.addEventListener('input', (e) => { const value = e.target.value; musicVolumeLabel.textContent = value; setMusicVolume(value / 100, true); });
sfxVolumeSlider.addEventListener('input', (e) => { const value = e.target.value; sfxVolumeLabel.textContent = value; setSfxVolume(value / 100, true); });
settingsButton.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
closeSettingsButton.addEventListener('click', () => { settingsModal.style.display = 'none'; });
pauseButton.addEventListener('click', togglePause);
startButton.addEventListener('click', () => {
    if (!gameRunning) {
        gameCycle = 1;
    }
    startGame();
});

loadSettings();
showInitialScreen();