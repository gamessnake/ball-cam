const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scale = 25; // اندازه هر خانه
const rows = 20;
const columns = 20;
canvas.width = columns * scale;
canvas.height = rows * scale;

let snake = [];
snake[0] = { x: 10, y: 10 };
let direction = "RIGHT";
let nextDirection = "RIGHT";
let food = spawnFood();
let score = 0;

let speed = 200;       // میلی‌ثانیه بین حرکت‌ها
let speedLevel = 1;    // عدد نمایش سرعت به کاربر

// کنترل کیبورد
window.addEventListener("keydown", e => {
  if(e.key === "ArrowUp" && direction !== "DOWN") nextDirection = "UP";
  if(e.key === "ArrowDown" && direction !== "UP") nextDirection = "DOWN";
  if(e.key === "ArrowLeft" && direction !== "RIGHT") nextDirection = "LEFT";
  if(e.key === "ArrowRight" && direction !== "LEFT") nextDirection = "RIGHT";
});

// کنترل موبایل با دکمه‌ها
document.getElementById("up").addEventListener("click", () => { if(direction!=="DOWN") nextDirection="UP"; });
document.getElementById("down").addEventListener("click", () => { if(direction!=="UP") nextDirection="DOWN"; });
document.getElementById("left").addEventListener("click", () => { if(direction!=="RIGHT") nextDirection="LEFT"; });
document.getElementById("right").addEventListener("click", () => { if(direction!=="LEFT") nextDirection="RIGHT"; });

function spawnFood(){
  return {
    x: Math.floor(Math.random()*columns),
    y: Math.floor(Math.random()*rows)
  };
}

function update(){
  direction = nextDirection;
  let headX = snake[0].x;
  let headY = snake[0].y;

  if(direction === "UP") headY--;
  if(direction === "DOWN") headY++;
  if(direction === "LEFT") headX--;
  if(direction === "RIGHT") headX++;

  // برخورد با دیوار یا خود مار
  if(headX<0 || headX>=columns || headY<0 || headY>=rows || collision(headX, headY)){
    alert("Game Over! Score: "+score);
    snake = [{x:10,y:10}];
    direction = "RIGHT";
    nextDirection = "RIGHT";
    score = 0;
    speed = 200;
    speedLevel = 1;
    food = spawnFood();
    setTimeout(update, speed);
    return;
  }

  snake.unshift({x:headX, y:headY});

  // خوردن غذا
  if(headX === food.x && headY === food.y){
    score++;
    food = spawnFood();
    if(speed>50) speed -= 5; // افزایش سرعت واقعی
    speedLevel++;             // افزایش سطح سرعت برای نمایش
  } else {
    snake.pop();
  }

  draw();
  setTimeout(update, speed);
}

function collision(x,y){
  for(let i=0;i<snake.length;i++){
    if(snake[i].x===x && snake[i].y===y) return true;
  }
  return false;
}

// رسم بازی
function draw(){
  ctx.fillStyle="#111";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // غذا دایره‌ای و جذاب
  ctx.fillStyle="orange";
  ctx.beginPath();
  ctx.arc(food.x*scale + scale/2, food.y*scale + scale/2, scale/2, 0, Math.PI*2);
  ctx.fill();
  ctx.closePath();

  // رسم مار با سر روشن و بدن دایره‌ای
  for(let i=0;i<snake.length;i++){
    let gradient = ctx.createRadialGradient(
      snake[i].x*scale + scale/2, snake[i].y*scale + scale/2, scale/4,
      snake[i].x*scale + scale/2, snake[i].y*scale + scale/2, scale/2
    );
    gradient.addColorStop(0, i===0 ? "#00FF00":"#00AA00");
    gradient.addColorStop(1, "#004400");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(snake[i].x*scale + scale/2, snake[i].y*scale + scale/2, scale/2, 0, Math.PI*2);
    ctx.fill();
    ctx.closePath();
  }

  // نمایش امتیاز و سرعت
  ctx.fillStyle="#fff";
  ctx.font="20px Arial";
  ctx.fillText("Score: "+score, 10, 20);
  ctx.fillText("Speed: "+speedLevel, 10, 45);
}

// شروع بازی
setTimeout(update, speed);