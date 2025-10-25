document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("startBtn");
  const bgMusic = document.getElementById("bgMusic");
  const eatSound = document.getElementById("eatSound");
  const deadSound = document.getElementById("deadSound");

  const grid = 20;
  let snake, direction, nextDirection, food, speed, running, gameLoop;

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
    speed = 200;
    running = false;
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
    ctx.fillStyle = "#001a00";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    if (!running) return;
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
      vibrate(200); // لرزش مردن
      alert("💀 باختی!");
      initGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      food = randomFood();
      speed = Math.max(60, speed - 10);
      clearInterval(gameLoop);
      gameLoop = setInterval(move, speed);
      eatSound.currentTime = 0;
      eatSound.play();
      vibrate(100); // لرزش غذا خوردن
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
  document.getElementById("ok").onclick = () => { /* میتونی مثلا Pause یا هیچ کاری */ };

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && direction !== "DOWN") nextDirection = "UP";
    if (e.key === "ArrowDown" && direction !== "UP") nextDirection = "DOWN";
    if (e.key === "ArrowLeft" && direction !== "RIGHT") nextDirection = "LEFT";
    if (e.key === "ArrowRight" && direction !== "LEFT") nextDirection = "RIGHT";
  });

  startBtn.onclick = () => {
    if (running) return;
    running = true;
    bgMusic.currentTime = 0;
    bgMusic.play();
    clearInterval(gameLoop);
    gameLoop = setInterval(move, speed);
  };

  initGame();
});