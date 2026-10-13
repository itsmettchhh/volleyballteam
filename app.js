
const STORAGE_KEY = "volleyPlannerMultiV1";

const DEFAULT_PLAYERS = [
  { id: "p1", name: "Cương", number: 10, role: "Setter", photo: "" },
  { id: "p2", name: "Nam", number: 7, role: "Outside Hitter", photo: "" },
  { id: "p3", name: "Hùng", number: 12, role: "Middle Blocker", photo: "" },
  { id: "p4", name: "Minh", number: 9, role: "Opposite", photo: "" },
  { id: "p5", name: "Tuấn", number: 3, role: "Outside Hitter", photo: "" },
  { id: "p6", name: "Long", number: 15, role: "Middle Blocker", photo: "" }
];

const COLORS = ["orange", "blue", "teal", "purple", "red", "gold"];

let lineups = loadData();
let selectedLineupId = lineups[0]?.id;
let editingPlayerId = null;

function makeLineup(name, color, players = null) {
  return {
    id: "lineup_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    name,
    color,
    rotation: 0,
    players: players || DEFAULT_PLAYERS.map((p, i) => ({
      ...p,
      id: "p_" + Date.now() + "_" + i,
      photo: ""
    }))
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.lineups?.length) return saved.lineups;
  } catch (e) {
    console.warn("Không thể đọc dữ liệu đã lưu.", e);
  }

  return [
    makeLineup("Đội hình 1", "orange"),
    makeLineup("Đội hình 2", "blue"),
    makeLineup("Đội hình 3", "teal")
  ];
}

function persistData(showMessage = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lineups }));
    if (showMessage) toast("Đã lưu dữ liệu đội hình.");
  } catch (e) {
    toast("Không thể lưu. Có thể ảnh cầu thủ quá lớn.");
  }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(word => word[0] || "")
    .join("")
    .toUpperCase();
}

function getSelectedLineup() {
  return lineups.find(lineup => lineup.id === selectedLineupId) || lineups[0];
}

function positionsAt(lineup, rotation) {
  const players = lineup.players.slice(0, 6);
  const positions = {};

  players.forEach((player, index) => {
    positions[index + 1] = player;
  });

  for (let i = 0; i < rotation; i++) {
    const previous = { ...positions };
    positions[1] = previous[2];
    positions[2] = previous[3];
    positions[3] = previous[4];
    positions[4] = previous[5];
    positions[5] = previous[6];
    positions[6] = previous[1];
  }

  return positions;
}

function playerToken(player) {
  if (!player) {
    return `
      <div class="player-token">
        <div class="initial">?</div>
      </div>
      <div class="token-name">Trống</div>
    `;
  }

  const avatar = player.photo
    ? `<img src="${player.photo}" alt="">`
    : `<div class="initial">${esc(initials(player.name))}</div>`;

  return `
    <div class="player-token">
      <div>${avatar}</div>
    </div>
    <div class="token-name">${esc(player.name)}</div>
  `;
}

function courtMarkup(lineup) {
  const positions = positionsAt(lineup, lineup.rotation);

  return `
    <div class="court-wrap">
      <div class="court">
        <div class="opponent-zone">ĐỐI THỦ</div>
        <div class="net"><span>LƯỚI</span></div>
        <div class="front-line"></div>
        ${[1, 2, 3, 4, 5, 6].map(position => `
          <div class="position p${position}" data-pos="${position}">
            ${playerToken(positions[position])}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLineups() {
  const grid = document.getElementById("lineupsGrid");
  if (!grid) return;

  document.getElementById("lineupCount").textContent =
    `${lineups.length} ĐỘI HÌNH`;

  grid.innerHTML = lineups.map(lineup => `
    <article
      class="lineup-card ${lineup.id === selectedLineupId ? "lineup-selected" : ""}"
      data-id="${lineup.id}"
      data-color="${lineup.color}"
    >
      <header class="lineup-card-header">
        <div class="lineup-title-wrap">
          <span class="lineup-color-dot"></span>
          <input
            class="lineup-name"
            aria-label="Tên đội hình"
            value="${esc(lineup.name)}"
            maxlength="40"
          >
        </div>
        <div class="lineup-actions">
          <button type="button" class="select-lineup" title="Chọn đội hình">✓</button>
          <button type="button" class="delete-lineup" title="Xóa đội hình">×</button>
        </div>
      </header>

      <div class="lineup-subtitle">ROTATION ${lineup.rotation + 1} / 6</div>

      ${courtMarkup(lineup)}

      <div class="lineup-rotation-controls">
        <button type="button" class="prev-rotation" aria-label="Vòng trước">←</button>
        <div class="lineup-rotation-label">
          Vòng ${lineup.rotation + 1} / 6
        </div>
        <button type="button" class="next-rotation" aria-label="Vòng tiếp theo">→</button>
      </div>

      <div class="lineup-roster-summary">
        <span><strong>${lineup.players.length}</strong> cầu thủ</span>
        <span>${lineup.id === selectedLineupId ? "Đang chỉnh sửa" : "Nhấn ✓ để chỉnh sửa"}</span>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".lineup-card").forEach(card => {
    const id = card.dataset.id;
    const lineup = lineups.find(item => item.id === id);
    if (!lineup) return;

    card.querySelector(".lineup-name").addEventListener("change", event => {
      lineup.name = event.target.value.trim() || "Đội hình";
      persistData();
      renderLineups();
    });

    card.querySelector(".select-lineup").onclick = () => {
      selectedLineupId = id;
      renderAll();
    };

    card.querySelector(".delete-lineup").onclick = () => {
      if (lineups.length <= 1) {
        toast("Cần giữ lại ít nhất một đội hình.");
        return;
      }

      if (!confirm(`Bạn muốn xóa "${lineup.name}"?`)) return;

      lineups = lineups.filter(item => item.id !== id);

      if (selectedLineupId === id) {
        selectedLineupId = lineups[0].id;
      }

      persistData();
      renderAll();
      toast("Đã xóa đội hình.");
    };

    card.querySelector(".prev-rotation").onclick = () => {
      lineup.rotation = (lineup.rotation + 5) % 6;
      persistData();
      renderLineups();
    };

    card.querySelector(".next-rotation").onclick = () => {
      lineup.rotation = (lineup.rotation + 1) % 6;
      persistData();
      renderLineups();
    };

    card.querySelector(".court").addEventListener("click", () => {
      if (selectedLineupId !== id) {
        selectedLineupId = id;
        renderAll();
      }
    });
  });
}

function renderPlayers() {
  const lineup = getSelectedLineup();
  const list = document.getElementById("playerList");
  if (!lineup || !list) return;

  const addButton = document.getElementById("addBtn");
  if (addButton) {
    addButton.textContent = `＋ Thêm cầu thủ — ${lineup.name}`;
  }

  if (!lineup.players.length) {
    list.innerHTML = '<p class="helper-text">Chưa có cầu thủ. Hãy thêm cầu thủ vào đội hình này.</p>';
    return;
  }

  list.innerHTML = lineup.players.map(player => {
    const avatar = player.photo
      ? `<img src="${player.photo}" alt="">`
      : esc(initials(player.name));

    return `
      <div class="player-item" data-id="${player.id}">
        <div class="player-avatar">${avatar}</div>
        <div class="player-meta">
          <strong>${esc(player.name)}</strong>
          <span>${esc(player.role)}</span>
        </div>
        <div class="shirt">#${esc(player.number)}</div>
        <div class="roster-actions">
          <button type="button" class="edit-player" title="Chỉnh sửa">✎</button>
          <button type="button" class="delete-player" title="Xóa">×</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".player-item").forEach(item => {
    const id = item.dataset.id;

    item.querySelector(".edit-player").onclick = () => openEdit(id);
    item.querySelector(".delete-player").onclick = () => deletePlayer(id);
  });
}

function renderRotationMap() {
  const holder = document.getElementById("rotationMap");
  const lineup = getSelectedLineup();
  if (!holder || !lineup) return;

  holder.innerHTML = "";

  for (let rotation = 0; rotation < 6; rotation++) {
    const positions = positionsAt(lineup, rotation);
    const card = document.createElement("div");

    card.className = `map-card ${rotation === lineup.rotation ? "active" : ""}`;
    card.innerHTML = `
      <h3>VÒNG ${rotation + 1}</h3>
      ${[1, 2, 3, 4, 5, 6].map(position => {
        const player = positions[position];
        return `
          <div class="map-player">
            <b>${position}</b>
            <div class="map-mini">${player ? esc(initials(player.name)) : "?"}</div>
            <span>${player ? esc(player.name) : "Trống"}</span>
          </div>
        `;
      }).join("")}
    `;

    card.onclick = () => {
      lineup.rotation = rotation;
      persistData();
      renderAll();
    };

    holder.appendChild(card);
  }
}

function renderAll() {
  renderLineups();
  renderPlayers();
  renderRotationMap();
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

function addLineup() {
  const number = lineups.length + 1;
  const color = COLORS[(lineups.length) % COLORS.length];

  const lineup = makeLineup(`Đội hình ${number}`, color);
  lineups.push(lineup);
  selectedLineupId = lineup.id;

  persistData();
  renderAll();
  toast("Đã thêm đội hình mới.");
}

function openAdd() {
  editingPlayerId = null;

  document.getElementById("modalTitle").textContent = "Thêm cầu thủ";
  document.getElementById("playerSubmit").textContent = "Thêm cầu thủ";
  document.getElementById("playerForm").reset();
  document.getElementById("pNumber").value = 1;
  document.getElementById("playerModal").classList.remove("hidden");
  document.getElementById("pName").focus();
}

function openEdit(id) {
  const lineup = getSelectedLineup();
  const player = lineup?.players.find(item => item.id === id);
  if (!player) return;

  editingPlayerId = id;
  document.getElementById("modalTitle").textContent = "Chỉnh sửa cầu thủ";
  document.getElementById("playerSubmit").textContent = "Lưu thay đổi";
  document.getElementById("pName").value = player.name;
  document.getElementById("pNumber").value = player.number;
  document.getElementById("pRole").value = player.role;
  document.getElementById("pPhoto").value = "";
  document.getElementById("playerModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("playerModal").classList.add("hidden");
  document.getElementById("playerForm").reset();
  editingPlayerId = null;
}

function deletePlayer(id) {
  const lineup = getSelectedLineup();
  const player = lineup?.players.find(item => item.id === id);
  if (!lineup || !player) return;

  if (!confirm(`Xóa cầu thủ ${player.name} khỏi "${lineup.name}"?`)) return;

  lineup.players = lineup.players.filter(item => item.id !== id);
  persistData();
  renderAll();
  toast("Đã xóa cầu thủ.");
}

document.getElementById("playerForm").onsubmit = event => {
  event.preventDefault();

  const lineup = getSelectedLineup();
  if (!lineup) return;

  const name = document.getElementById("pName").value.trim();
  const number = Number(document.getElementById("pNumber").value);
  const role = document.getElementById("pRole").value;
  const file = document.getElementById("pPhoto").files[0];

  const finish = photo => {
    if (editingPlayerId) {
      const player = lineup.players.find(item => item.id === editingPlayerId);
      if (!player) return;

      player.name = name;
      player.number = number;
      player.role = role;
      if (photo !== null) player.photo = photo;

      toast("Đã cập nhật cầu thủ.");
    } else {
      lineup.players.push({
        id: "player_" + Date.now(),
        name,
        number,
        role,
        photo: photo || ""
      });

      toast("Đã thêm cầu thủ.");
    }

    closeModal();
    persistData();
    renderAll();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.onerror = () => toast("Không đọc được ảnh.");
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
};

document.getElementById("addLineupBtn").onclick = addLineup;
document.getElementById("addBtn").onclick = openAdd;
document.getElementById("saveBtn").onclick = () => persistData(true);
document.getElementById("closeModal").onclick = closeModal;

document.getElementById("playerModal").onclick = event => {
  if (event.target.id === "playerModal") closeModal();
};

document.getElementById("matchName").value =
  localStorage.getItem("volleyPlannerMatchName") || "Friendly Match";

document.getElementById("matchName").addEventListener("change", event => {
  localStorage.setItem("volleyPlannerMatchName", event.target.value);
  toast("Đã lưu tên giải đấu.");
});

renderAll();
