const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const eatSound = document.getElementById("eat-sound");
const gameOverSound = document.getElementById("gameover-sound");
const startBtn = document.getElementById("start-btn");

const scale = 20; // 🟢 کوچکتر از قبل
const rows = 20;
const columns = 20;
canvas.width = columns * scale;
canvas.height = rows * scale;

let snake = [{ x: 10, y: 10 }];
let direction = "RIGHT";
let nextDirection = "RIGHT";
let food = spawnFood();
let score = 0;
let speed = 200;
let speedLevel = 1;
let gameRunning = false;
let gameTimer = null;

// کنترل کیبورد
window.addEventListener("keydown", e => {
  if(!gameRunning) return; // قبل از شروع بازی بی‌اثر
  if(e.key === "ArrowUp" && direction !== "DOWN") nextDirection = "UP";
  if(e.key === "ArrowDown" && direction !== "UP") nextDirection = "DOWN";
  if(e.key === "ArrowLeft" && direction !== "RIGHT") nextDirection = "LEFT";
  if(e.key === "ArrowRight" && direction !== "LEFT") nextDirection = "RIGHT";
});

// کنترل موبایل
["up","down","left","right"].forEach(id => {
  document.getElementById(id).addEventListener("click", () => {
    if(!gameRunning) return;
    if(id==="up" && direction!=="DOWN") nextDirection="UP";
    if(id==="down" && direction!=="UP") nextDirection="DOWN";
    if(id==="left" && direction!=="RIGHT") nextDirection="LEFT";
    if(id==="right" && direction!=="LEFT") nextDirection="RIGHT";
  });
});

// دکمه شروع بازی
startBtn.addEventListener("click", () => {
  if(!gameRunning){
    startGame();
    startBtn.textContent = "در حال بازی...";
    startBtn.disabled = true;
    startBtn.style.opacity = 0.6;
  }
});

function startGame(){
  gameRunning = true;
  update();
}

function spawnFood(){
  return {
    x: Math.floor(Math.random()*columns),
    y: Math.floor(Math.random()*rows)
  };
}

function update(){
  if(!gameRunning) return;

  direction = nextDirection;
  let headX = snake[0].x;
  let headY = snake[0].y;

  if(direction === "UP") headY--;
  if(direction === "DOWN") headY++;
  if(direction === "LEFT") headX--;
  if(direction === "RIGHT") headX++;

  if(headX<0 || headX>=columns || headY<0 || headY>=rows || collision(headX, headY)){
    gameOverSound.play();
    if (navigator.vibrate) navigator.vibrate([200,100,200]);
    alert("💀 Game Over! Score: "+score);
    resetGame();
    return;
  }

  snake.unshift({x:headX, y:headY});

  if(headX === food.x && headY === food.y){
    score++;
    eatSound.currentTime = 0;
    eatSound.play();
    if (navigator.vibrate) navigator.vibrate(100);
    food = spawnFood();
    if(speed>50) speed -= 5;
    speedLevel++;
  } else {
    snake.pop();
  }

  draw();
  gameTimer = setTimeout(update, speed);
}

function resetGame(){
  clearTimeout(gameTimer);
  snake = [{x:10,y:10}];
  direction = "RIGHT";
  nextDirection = "RIGHT";
  score = 0;
  speed = 200;
  speedLevel = 1;
  food = spawnFood();
  gameRunning = false;
  startBtn.textContent = "شروع دوباره ▶️";
  startBtn.disabled = false;
  startBtn.style.opacity = 1;
  draw();
}

function collision(x,y){
  return snake.some(part => part.x === x && part.y === y);
}

function draw(){
  ctx.fillStyle="#001a00";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // غذا
  ctx.fillStyle="lime";
  ctx.beginPath();
  ctx.arc(food.x*scale + scale/2, food.y*scale + scale/2, scale/2, 0, Math.PI*2);
  ctx.fill();
  ctx.closePath();

  // مار
  for(let i=0;i<snake.length;i++){
    let gradient = ctx.createRadialGradient(
      snake[i].x*scale + scale/2, snake[i].y*scale + scale/2, scale/6,
      snake[i].x*scale + scale/2, snake[i].y*scale + scale/2, scale/2
    );
    gradient.addColorStop(0, i===0 ? "#9efc9e":"#3aff3a");
    gradient.addColorStop(1, "#004400");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(snake[i].x*scale + scale/2, snake[i].y*scale + scale/2, scale/2, 0, Math.PI*2);
    ctx.fill();
    ctx.closePath();
  }

  // امتیاز و سرعت
  ctx.fillStyle="#9efc9e";
  ctx.font="16px Courier New";
  ctx.fillText("Score: "+score, 10, 20);
  ctx.fillText("Speed: "+speedLevel, 10, 40);
}