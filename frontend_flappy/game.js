const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Ảnh
const bg = new Image(); bg.src = "assets/bg.png";
const birdImg = new Image(); birdImg.src = "assets/bird.png";
const groundImg = new Image(); groundImg.src = "assets/ground.png";
const pipeImg = new Image(); pipeImg.src = "assets/pipe.png";

// Biến game
let birdX = 50, birdY = 200, gravity = 0.4, velocity = 0, jump = -7;
let score = 0, gameOver = false, started = false;
let pipes = [{ x: 400, y: -150 }];

// Click để bắt đầu hoặc nhảy
canvas.addEventListener("mousedown", () => {
  if (!started) {
    started = true; // bắt đầu game khi click lần đầu
  } else if (!gameOver) {
    velocity = jump;
  }
});

// Reset game
function resetGame() {
  birdX = 50;
  birdY = 200;
  velocity = 0;
  score = 0;
  pipes = [{ x: 400, y: -150 }];
  gameOver = false;
  started = false;
  draw();
}

// Gửi điểm đến backend
async function sendScore(name, score) {
  try {
    const res = await fetch("http://127.0.0.1:8080/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
    console.log("✅ Gửi điểm thành công:", await res.json());
  } catch (err) {
    console.error("❌ Không thể gửi điểm:", err);
  }
}

// Hiện bảng Game Over
function showGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2 - 110, canvas.height / 2 - 20);
  ctx.font = "24px Arial";
  ctx.fillText(`Điểm: ${score}`, canvas.width / 2 - 60, canvas.height / 2 + 20);

  setTimeout(() => {
    const name = prompt("Nhập tên của bạn để lưu điểm:");
    if (name) sendScore(name, score);
  }, 400);
}

// Nút chơi lại
document.getElementById("restartBtn").addEventListener("click", resetGame);

// Hiện bảng xếp hạng
document.getElementById("leaderboardBtn").addEventListener("click", async () => {
  showLeaderboard();
});

document.getElementById("closeLeaderboard").addEventListener("click", () => {
  document.getElementById("leaderboard").classList.add("hidden");
});

async function showLeaderboard() {
  document.getElementById("leaderboard").classList.remove("hidden");
  const list = document.getElementById("leaderboardList");
  list.innerHTML = "<li>⏳ Đang tải...</li>";

  try {
    const res = await fetch("http://127.0.0.1:8080/scores");
    if (!res.ok) throw new Error("Lỗi HTTP: " + res.status);
    const data = await res.json();
    list.innerHTML = data
      .map((p, i) => `<li>${i + 1}. <b>${p.name}</b> — ${p.score} điểm</li>`)
      .join("");
  } catch (err) {
    console.error(err);
    list.innerHTML = "<li>Lỗi khi tải bảng xếp hạng 😢</li>";
  }
}

// ⚙️ Menu cài đặt
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
const closeSettings = document.getElementById("closeSettings");

settingsBtn.addEventListener("click", () => settingsMenu.classList.remove("hidden"));
closeSettings.addEventListener("click", () => settingsMenu.classList.add("hidden"));

// Các nút trong menu
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "index.html");
document.getElementById("backBtn").addEventListener("click", () => history.back());
document.getElementById("resetBtn").addEventListener("click", () => { resetGame(); settingsMenu.classList.add("hidden"); });
document.getElementById("menuLeaderboardBtn").addEventListener("click", () => { showLeaderboard(); settingsMenu.classList.add("hidden"); });

// Game loop
function draw() {
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  if (!started) {
    // Chim lượn nhẹ chờ người chơi bấm
    birdY = 200 + Math.sin(Date.now() / 300) * 10;
    ctx.drawImage(birdImg, birdX, birdY, 50, 35);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("Bấm chuột để bắt đầu!", 80, canvas.height / 2);
    requestAnimationFrame(draw);
    return;
  }

  if (gameOver) return;

  // Ống
  for (let i = 0; i < pipes.length; i++) {
    let p = pipes[i];
    ctx.drawImage(pipeImg, p.x, p.y, 60, 300);
    ctx.drawImage(pipeImg, p.x, p.y + 420, 60, 300);

    p.x -= 2;
    if (p.x === 200) pipes.push({ x: 400, y: Math.floor(Math.random() * -200) });
    if (p.x + 60 === birdX) score++;

    if (
      (birdX + 34 >= p.x && birdX <= p.x + 60 && birdY <= p.y + 300) ||
      (birdX + 34 >= p.x && birdX <= p.x + 60 && birdY + 24 >= p.y + 420)
    ) {
      gameOver = true;
    }
  }

  if (pipes[0].x < -60) pipes.shift();

  velocity += gravity;
  birdY += velocity;

  if (birdY + 24 >= canvas.height - 100) gameOver = true;

  ctx.drawImage(groundImg, 0, canvas.height - 100, canvas.width, 100);
  ctx.drawImage(birdImg, birdX, birdY, 50, 35);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Điểm: " + score, 10, 30);

  if (gameOver) {
    showGameOver();
    return;
  }

  requestAnimationFrame(draw);
}

draw();
