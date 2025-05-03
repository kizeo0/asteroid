// ... (código existente al principio) ...
const startButton = document.getElementById('startButton');

// NUEVO: Referencias a botones móviles
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnThrust = document.getElementById('btn-thrust');
const btnShoot = document.getElementById('btn-shoot');
// FIN NUEVO

// --- Recursos ---
// ... (resto del código hasta los controles) ...

// --- Controles ---
let keys = {}; // Ya existe

// Event listeners de Teclado (existentes)
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- NUEVO: Event listeners Táctiles ---

// Función auxiliar para manejar inicio/fin de toque
function handleTouchEvent(event, keyCode, isPressed) {
    // Prevenir comportamiento por defecto (scroll, zoom, etc.)
    event.preventDefault();
    keys[keyCode] = isPressed;
}

// Botón Izquierda
btnLeft.addEventListener('touchstart', (e) => handleTouchEvent(e, 'ArrowLeft', true), { passive: false });
btnLeft.addEventListener('touchend', (e) => handleTouchEvent(e, 'ArrowLeft', false), { passive: false });
btnLeft.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'ArrowLeft', false), { passive: false }); // Por si se interrumpe el toque

// Botón Derecha
btnRight.addEventListener('touchstart', (e) => handleTouchEvent(e, 'ArrowRight', true), { passive: false });
btnRight.addEventListener('touchend', (e) => handleTouchEvent(e, 'ArrowRight', false), { passive: false });
btnRight.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'ArrowRight', false), { passive: false });

// Botón Acelerar
btnThrust.addEventListener('touchstart', (e) => handleTouchEvent(e, 'ArrowUp', true), { passive: false });
btnThrust.addEventListener('touchend', (e) => handleTouchEvent(e, 'ArrowUp', false), { passive: false });
btnThrust.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'ArrowUp', false), { passive: false });

// Botón Disparar
btnShoot.addEventListener('touchstart', (e) => handleTouchEvent(e, 'Space', true), { passive: false });
btnShoot.addEventListener('touchend', (e) => handleTouchEvent(e, 'Space', false), { passive: false });
btnShoot.addEventListener('touchcancel', (e) => handleTouchEvent(e, 'Space', false), { passive: false });

// --- FIN NUEVO ---


// --- Funciones del Juego ---
// ... (resto del código sin cambios necesarios aquí, ya que updatePlayer usa `keys`) ...

// --- AJUSTE: Adaptar tamaño del canvas al contenedor (opcional pero recomendado) ---
function resizeCanvas() {
    // Obtenemos el tamaño del contenedor padre
    const container = document.getElementById('game-container');
    // Leemos el ancho computado real del contenedor
    const containerWidth = container.clientWidth;

    // Mantenemos la proporción original (800x600)
    const aspectRatio = 800 / 600;
    const newHeight = containerWidth / aspectRatio;

    // Ajustamos el tamaño del canvas
    canvas.width = containerWidth;
    // Asegúrate de que el alto no exceda la altura de la ventana menos otros elementos
    canvas.height = Math.min(newHeight, window.innerHeight - 100); // 100 es un margen aprox.

    // IMPORTANTE: Si cambias el tamaño del canvas, necesitas resetear
    // algunas propiedades del contexto y potencialmente reposicionar elementos
    // si sus posiciones dependen del tamaño inicial del canvas.
    // En este caso, el reset del jugador en startGame y hitPlayer
    // usa canvas.width/2 y canvas.height/2, lo cual está bien.
    // Podrías necesitar re-dibujar el estado actual si redimensionas durante el juego.

    // Si el juego está corriendo, redibuja el estado actual
     if (gameRunning) {
         // Podrías llamar a una función que redibuje todo sin actualizar lógica
         // drawBackground(); drawPlayer(); drawEnemies(); ...
         // O simplemente dejar que el próximo frame de gameLoop lo haga.
         // Por simplicidad, no lo haremos aquí, pero tenlo en cuenta.
     } else {
         // Si el juego no ha empezado, dibuja el mensaje inicial de nuevo
         drawInitialMessage(); // Necesitamos crear esta función
     }

     console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
}

// Función para dibujar el mensaje inicial (separada para poder reusarla)
function drawInitialMessage() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Dibuja el fondo si ya está cargado
    if (bgImg.complete && bgImg.naturalHeight !== 0) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Fondo semitransparente para el texto
    ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120); // Ajusta tamaño/posición
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡Prepara tus láseres!', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText('Haz clic en "Iniciar Juego" / "Jugar de Nuevo"', canvas.width / 2, canvas.height / 2);
    ctx.fillText('cuando estés listo.', canvas.width / 2, canvas.height / 2 + 30);
}

// Llama a resizeCanvas al cargar y si cambia el tamaño la ventana
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    resizeCanvas(); // Llama al cargar la página por primera vez
    // Ocultar instrucciones al inicio, ya que el mensaje inicial las cubre
    document.getElementById('instructions').style.display = 'none';
});


function startGame() {
    if (gameRunning) return;

    // Resetear estado del juego
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    // Usar el tamaño actual del canvas para centrar al jugador
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
    keys = {}; // Asegurarse de que las teclas táctiles también se resetean
    enemySpawnCounter = 0;
    enemySpawnRate = ENEMY_SPAWN_RATE_INITIAL;

    updateScoreAndLevel();

    gameRunning = true;
    startButton.style.display = 'none';
    // Mostrar instrucciones al iniciar el juego
    document.getElementById('instructions').style.display = 'block';
    // Ocultar controles móviles mientras el botón Start está visible? No, mejor no.

    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("Reproducción auto de música bloqueada."));

    gameLoop();
}

function gameOver(message = "¡Has Perdido!") {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // Usar el tamaño actual del canvas para centrar el mensaje
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "30px Arial"; // Ajustar tamaño fuente si es necesario
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "18px Arial"; // Ajustar tamaño fuente
    ctx.fillText(`Puntaje final: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Nivel alcanzado: ${level}`, canvas.width / 2, canvas.height / 2 + 30);

    startButton.textContent = "Jugar de Nuevo";
    startButton.style.display = 'block';
    document.getElementById('instructions').style.display = 'none'; // Ocultar instrucciones en Game Over
}


// --- Inicio del Juego ---
startButton.addEventListener('click', startGame);

// Mensaje inicial o preparación -> Ahora se llama desde el 'load' y 'resize'
// drawInitialMessage(); // No llamar aquí directamente, se llama en 'load'
// document.getElementById('instructions').style.display = 'none'; // Ya se hace en 'load'

// ... (resto del código si hubiera) ...