// ========================================================================= //
//   CONTENIDO COMPLETO DE game.js (con nueva gestión de vistas de menú)     //
// ========================================================================= //

// --- Referencias a Vistas y Elementos Principales ---
const gameWrapper = document.getElementById('game-wrapper');
const touchControlsDiv = document.getElementById('touch-controls');
const mainMenuContainer = document.getElementById('main-menu-view');
const editsView = document.getElementById('edits-view');
const startButton = document.getElementById('startButton');
const editsButton = document.getElementById('editsButton');
const backButton = document.getElementById('back-button');
const settingsButtonMain = document.getElementById('settings-button-main');
// NUEVAS referencias para el reproductor de video
const videoPlayerView = document.getElementById('video-player-view');
const videoPlayer = document.getElementById('edit-video-player');
const backFromVideoButton = document.getElementById('back-from-video-button');
const videoGrid = document.querySelector('.video-grid');

// --- Referencias del Juego ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const instructionsDiv = document.getElementById('instructions');
const gameTitle = document.getElementById('game-title');

// --- Referencias a Elementos de UI/Ajustes ---
const pauseButton = document.getElementById('pause-button');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = document.getElementById('close-settings-button');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
const musicVolumeLabel = document.getElementById('music-volume-label');
const sfxVolumeLabel = document.getElementById('sfx-volume-label');
const settingsTitle = document.getElementById('settings-title');

// --- (El resto de las referencias a dev menu, botones táctiles, imágenes y sonidos no cambia) ---
const devMenu = document.getElementById('dev-menu');
const closeDevMenuButton = document.getElementById('close-dev-menu');
// ...etc.

// --- Variables de Estado del Juego (sin cambios) ---
let gameRunning = false;
let isPaused = false;
let score = 0;
let lives = 3;
let level = 1;
let gameCycle = 1;
let animationFrameId;
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 180; // 3 segundos a 60fps
const PLAYER_SIZE = 20;
let player = {};
let isPlayerLocked = false;
let gamePhase = 'momo';

// --- LÓGICA DE GESTIÓN DE VISTAS (MODIFICADA) ---
function showMainMenu() {
    mainMenuContainer.style.display = 'flex';
    editsView.style.display = 'none';
    gameWrapper.style.display = 'none';
    touchControlsDiv.style.display = 'none';
    pauseButton.style.display = 'none';
    videoPlayerView.style.display = 'none'; // Asegurarse de que esté oculto
}

function showEditsMenu() {
    mainMenuContainer.style.display = 'none';
    editsView.style.display = 'flex';
    videoPlayerView.style.display = 'none'; // Ocultar reproductor al volver a la lista
}

function showGameView() {
    mainMenuContainer.style.display = 'none';
    editsView.style.display = 'none';
    videoPlayerView.style.display = 'none'; // Ocultar reproductor si se inicia el juego
    gameWrapper.style.display = 'flex';
    pauseButton.style.display = 'flex';
    
    // Solo mostrar controles táctiles en dispositivos táctiles
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        touchControlsDiv.style.display = 'flex';
    }
}

// NUEVA función para mostrar el reproductor de video
function showVideoPlayer(videoSrc) {
    editsView.style.display = 'none';
    videoPlayerView.style.display = 'flex';
    videoPlayer.src = videoSrc;
    videoPlayer.load();
    videoPlayer.play().catch(e => console.error("Error al reproducir el video:", e));
}


// --- LÓGICA DEL JUEGO (con modificaciones menores) ---

function startGame() {
    if (gameRunning && !isPaused) return;
    isPaused = false;
    gameRunning = true;
    isPlayerLocked = false;

    showGameView(); // <<--- Muestra la vista del juego
    devMenu.style.display = 'none';

    gamePhase = 'momo';
    document.body.classList.remove('madeline-theme');
    gameTitle.textContent = `Asteroides Infinito (Ciclo ${gameCycle})`;
    
    if (gameCycle === 1) { score = 0; }
    level = 1; 
    lives = INITIAL_LIVES; 
    
    player = {
        x: canvas.width / 2, y: canvas.height / 2, width: PLAYER_SIZE, height: PLAYER_SIZE,
        angle: -Math.PI / 2, vx: 0, vy: 0, rotation: 0, thrusting: false,
        shootCooldown: 0, baseFireRate: 18, currentFireRate: 18, fireRateBoostTimer: 0,
        invincible: true, invincibilityTimer: INVINCIBILITY_DURATION,
        parryActive: false, parryTimer: 0, parryCooldown: 0,
        grenadeCooldown: 0
    };
    // Esta función debe existir en tu código original, si no, defínela
    // updateScoreAndLevel(); 

    // Pausar y reiniciar música
    const bossMusic = document.getElementById('bossMusic');
    const madelineMusic = document.getElementById('madelineMusic');
    const bgMusic = document.getElementById('bgMusic');
    bossMusic.pause(); 
    madelineMusic.pause();
    bossMusic.currentTime = 0; 
    madelineMusic.currentTime = 0;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.warn("Música de fondo requiere interacción."));

    // Esta función debe existir en tu código original, si no, defínela
    // scheduleLevelZoms(); 
    
    cancelAnimationFrame(animationFrameId);
    // Esta función debe existir en tu código original, si no, defínela
    // animationFrameId = requestAnimationFrame(gameLoop); 
}

function gameOver(message = "¡JUEGO TERMINADO!") {
    if (!gameRunning) return;
    gameCycle = 1;
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    
    const bgMusic = document.getElementById('bgMusic');
    const bossMusic = document.getElementById('bossMusic');
    const madelineMusic = document.getElementById('madelineMusic');
    bgMusic.pause(); 
    bossMusic.pause(); 
    madelineMusic.pause();

    setTimeout(() => {
        showMainMenu(); 
        gamePhase = 'momo';
        document.body.classList.remove('madeline-theme');
        // Esta función debe existir en tu código original, si no, defínela
        // updateAbilityButtonUI(); 
        
        gameWrapper.style.display = 'flex'; 
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white"; 
        ctx.font = "bold 30px Arial"; 
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = "20px Arial";
        ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 20);
        startButton.textContent = "Jugar de Nuevo";

        setTimeout(showMainMenu, 3000);

    }, 50);
}


// --- EVENT LISTENERS E INICIALIZACIÓN (MODIFICADO) ---

// Botones de cambio de vista
startButton.addEventListener('click', () => {
    if (!gameRunning) { gameCycle = 1; }
    // La función startGame() debe estar definida en tu código
    startGame();
});

editsButton.addEventListener('click', showEditsMenu);
backButton.addEventListener('click', showMainMenu);

// NUEVO: Listener para la grilla de videos (usando delegación de eventos)
videoGrid.addEventListener('click', (event) => {
    // Comprobar si el elemento clickeado es un video-item
    if (event.target && event.target.classList.contains('video-item')) {
        event.preventDefault(); // Prevenir cualquier comportamiento por defecto del enlace
        const videoSrc = event.target.getAttribute('data-video-src');
        if (videoSrc) {
            showVideoPlayer(videoSrc);
        }
    }
});

// NUEVO: Listener para el botón de volver desde el video
backFromVideoButton.addEventListener('click', () => {
    videoPlayer.pause(); // Pausar el video para que no se siga escuchando
    videoPlayer.currentTime = 0; // Opcional: reiniciar el video
    showEditsMenu(); // Mostrar la lista de edits nuevamente
});


// Botones de pausa y ajustes
// La función togglePause() debe estar definida en tu código
// pauseButton.addEventListener('click', () => togglePause()); 

settingsButtonMain.addEventListener('click', () => {
    settingsTitle.textContent = 'Ajustes de Sonido';
    closeSettingsButton.textContent = 'Cerrar';
    settingsModal.style.display = 'flex';
});

closeSettingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    // La función togglePause() debe estar definida en tu código
    // if (gameRunning && isPaused) { togglePause(false); } 
});

// El resto de los event listeners (sliders, dev menu, etc.) no cambian...
// ...

// Estado inicial al cargar la página
showMainMenu();
// La función loadSettings() debe estar definida en tu código
// loadSettings();

// NOTA: Se han comentado las llamadas a funciones que no estaban en el extracto original
// que me proporcionaste (como gameLoop, togglePause, updateScoreAndLevel, etc.). 
// Deberás asegurarte de que esas funciones existan en tu código completo para que todo funcione.