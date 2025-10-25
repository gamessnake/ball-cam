
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("startBtn");
  const bgMusic = document.getElementById("bgMusic");
  const eatSound = document.getElementById("eatSound");
  const deadSound = document.getElementById("deadSound");

  const grid = 20;
  let snake, direction, nextDirection, food, speed, running, paused, gameLoop;
  let score = 0;

  function resizeCanvas() {
    const size = Math.min(window.innerWidth * 0.9, 400);
    canvas.width = size;
    canvas.height = size;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function initGame() {
    snake = [{ x: 10, y: 10 }];
    direction = "RIGHT";
    nextDirection = "RIGHT";
    food = randomFood();
    speed = 400; // شروع آهسته
    running = false;
    paused = false;
    score = 0;
    clearInterval(gameLoop);
    draw();
  }

  function randomFood() {
    return {
      x: Math.floor(Math.random() * grid),
      y: Math.floor(Math.random() * grid),
    };
  }

  function vibrate(duration = 100) {
    if (navigator.vibrate) navigator.vibrate(duration);
  }

  function draw() {
    const cell = canvas.width / grid;
    // پس‌زمینه سبز
    ctx.fillStyle = "#0a3d0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // امتیاز و سرعت داخل کانواس
    ctx.fillStyle = "#ffffff";
    ctx.font = (canvas.width / 20) + "px Arial";
    ctx.textAlign = "left";
    ctx.fillText("امتیاز: " + score, 5, canvas.width / 20 + 5);
    ctx.fillText("سرعت: " + ((400 - speed) / 20 + 1).toFixed(1), 5, canvas.width / 10 + 5);

    // غذا
    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell / 3, 0, Math.PI * 2);
    ctx.fill();

    // مار
    for (let i = 0; i < snake.length; i++) {
      const part = snake[i];
      ctx.fillStyle = i === 0 ? "#00ff00" : "#00cc66";
      ctx.beginPath();
      ctx.roundRect(part.x * cell, part.y * cell, cell - 2, cell - 2, 6);
      ctx.fill();
    }
  }

  function move() {
    if (!running || paused) return; // اگر بازی متوقف شده باشه، حرکت نکنه
    const head = { ...snake[0] };
    direction = nextDirection;

    if (direction === "UP") head.y--;
    else if (direction === "DOWN") head.y++;
    else if (direction === "LEFT") head.x--;
    else if (direction === "RIGHT") head.x++;

    if (head.x < 0 || head.y < 0 || head.x >= grid || head.y >= grid ||
        snake.some((s) => s.x === head.x && s.y === head.y)) {
      bgMusic.pause();
      deadSound.currentTime = 0;
      deadSound.play();
      vibrate(200);
      alert("💀 باختی!");
      initGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      food = randomFood();
      score++;
      speed = Math.max(80, speed - 15);
      clearInterval(gameLoop);
      gameLoop = setInterval(move, speed);
      eatSound.currentTime = 0;
      eatSound.play();
      vibrate(100);
    } else {
      snake.pop();
    }

    draw();
  }

  // کنترل جهت‌ها
  document.getElementById("up").onclick = () => { if (direction !== "DOWN") nextDirection = "UP"; };
  document.getElementById("down").onclick = () => { if (direction !== "UP") nextDirection = "DOWN"; };
  document.getElementById("left").onclick = () => { if (direction !== "RIGHT") nextDirection = "LEFT"; };
  document.getElementById("right").onclick = () => { if (direction !== "LEFT") nextDirection = "RIGHT"; };

  // کلید OK برای Pause/Resume
  document.getElementById("ok").onclick = () => {
    if (!running) return;
    paused = !paused;
    if (!paused) {
      // ادامه بازی
      clearInterval(gameLoop);
      gameLoop = setInterval(move, speed);
    } else {
      clearInterval(gameLoop);
    }
  };

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && direction !== "DOWN") nextDirection = "UP";
    if (e.key === "ArrowDown" && direction !== "UP") nextDirection = "DOWN";
    if (e.key === "ArrowLeft" && direction !== "RIGHT") nextDirection = "LEFT";
    if (e.key === "ArrowRight" && direction !== "LEFT") nextDirection = "RIGHT";
    if (e.key === " ") { // فاصله هم Pause/Resume کنه
      if (running) {
        paused = !paused;
        if (!paused) {
          clearInterval(gameLoop);
          gameLoop = setInterval(move, speed);
        } else {
          clearInterval(gameLoop);
        }
      }
    }
  });

  // دکمه شروع
  startBtn.onclick = () => {
    if (running) return;
    running = true;
    paused = false;
    bgMusic.currentTime = 0;
    bgMusic.play();
    clearInterval(gameLoop);
    gameLoop = setInterval(move, speed);
  };

  initGame();
});