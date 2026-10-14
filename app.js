
"use strict";

/* =========================
   VOLLEY PLANNER
   ========================= */

const STORAGE_KEY = "volleyPlannerMultiV1";
const OLD_STORAGE_KEYS = ["volleyPlannerV3", "volleyPlannerV1"];
const COLORS = ["orange", "blue", "teal", "purple", "red", "gold"];

const DEFAULT_PLAYERS = [
  { name: "Nguyễn Tuấn Thành Cương", number: 1, role: "Universal" },
  { name: "Đào Minh Tuấn", number: 2, role: "Setter" },
  { name: "Trần Đức Uy", number: 3, role: "Outside Hitter" },
  { name: "Dũng Thế Bình", number: 4, role: "Middle Blocker" },
  { name: "Ngô Huy Khải", number: 5, role: "Outside Hitter" },
  { name: "Nguyễn Thế Kỷ", number: 6, role: "Opposite" },
  { name: "Dù Tiến Đạt", number: 7, role: "Middle Blocker" },
  { name: "Tô Bot Huy", number: 8, role: "Universal" },
  { name: "Nguyễn Phú Trọng", number: 9, role: "Outside Hitter" },
  { name: "Nguyễn Đình Cần", number: 10, role: "Universal" },
  { name: "Bùi Phi Sơn", number: 11, role: "Universal" }
];

let lineups = [];
let selectedLineupId = null;
let editingPlayerId = null;
let toastTimer = null;
let draggedPlayerId = null;
let presentationMode = false;

/* =========================
   DATA
   ========================= */

function makeId(prefix = "id") {
  return prefix + "_" + Date.now().toString(36) +
    "_" + Math.random().toString(36).slice(2, 8);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makePlayers() {
  return DEFAULT_PLAYERS.map(player => ({
    id: makeId("player"),
    name: player.name,
    number: player.number,
    role: player.role,
    photo: ""
  }));
}

function makeLineup(name, color, players = null) {
  return {
    id: makeId("lineup"),
    name,
    color,
    rotation: 0,
    players: players ? clone(players) : makePlayers()
  };
}

function normalizeLineup(item, index) {
  const sourcePlayers = Array.isArray(item.players) ? item.players : [];

  const players = sourcePlayers.map((player, playerIndex) => ({
    id: String(player.id || makeId("player")),
    name: String(player.name || "Cầu thủ " + (playerIndex + 1)),
    number: Number(player.number ?? playerIndex + 1),
    role: String(player.role || "Universal"),
    photo: typeof player.photo === "string" ? player.photo : ""
  }));

  return {
    id: String(item.id || makeId("lineup")),
    name: String(item.name || item.teamName || "Đội hình " + (index + 1)),
    color: COLORS.includes(item.color) ? item.color : COLORS[index % COLORS.length],
    rotation: ((Number(item.rotation) || 0) % 6 + 6) % 6,
    players
  };
}

function readSavedData() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (Array.isArray(current?.lineups) && current.lineups.length) {
      return current.lineups.map(normalizeLineup);
    }

    if (Array.isArray(current) && current.length) {
      return current.map(normalizeLineup);
    }
  } catch (error) {
    console.warn("Không đọc được dữ liệu đội hình mới:", error);
  }

  /* Nếu có dữ liệu từ phiên bản cũ, giữ lại danh sách cầu thủ. */
  for (const key of OLD_STORAGE_KEYS) {
    try {
      const old = JSON.parse(localStorage.getItem(key) || "null");

      if (old && Array.isArray(old.lineups) && old.lineups.length) {
        return old.lineups.map(normalizeLineup);
      }

      if (old && Array.isArray(old.players) && old.players.length) {
        const players = old.players.map((player, index) => ({
          id: makeId("player"),
          name: String(player.name || "Cầu thủ " + (index + 1)),
          number: Number(player.number ?? index + 1),
          role: String(player.role || "Universal"),
          photo: typeof player.photo === "string" ? player.photo : ""
        }));

        return [
          makeLineup("Đội hình 1", "orange", players),
          makeLineup("Đội hình 2", "blue", players),
          makeLineup("Đội hình 3", "teal", players)
        ];
      }
    } catch (error) {
      console.warn("Không đọc được dữ liệu cũ:", error);
    }
  }

  return [
    makeLineup("Đội hình 1", "orange"),
    makeLineup("Đội hình 2", "blue"),
    makeLineup("Đội hình 3", "teal")
  ];
}

function saveData(showMessage = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lineups,
      selectedLineupId,
      matchName: document.getElementById("matchName")?.value || "Friendly Match"
    }));

    if (showMessage) showToast("Đã lưu dữ liệu đội hình.");
  } catch (error) {
    console.error(error);
    showToast("Không thể lưu. Hãy thử dùng ảnh nhỏ hơn.");
  }
}

function getSelectedLineup() {
  return lineups.find(item => item.id === selectedLineupId) || lineups[0] || null;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function getInitials(name) {
  const words = String(name || "?").trim().split(/\s+/);
  return words.slice(-2).map(word => word[0] || "").join("").toUpperCase();
}

/* =========================
   VOLLEYBALL ROTATION
   ========================= */

/*
  players[0] là cầu thủ ở vị trí 1 khi rotation = 0.
  Mỗi vòng xoay theo chiều kim đồng hồ:
  2 -> 1, 1 -> 6, 6 -> 5, 5 -> 4, 4 -> 3, 3 -> 2.

  Công thức hiển thị:
  cầu thủ ở vị trí P sau R vòng = players[(P - 1 + R) % 6].
  Chỉ 6 cầu thủ đầu nằm trên sân; các cầu thủ còn lại là dự bị.
*/

function positionsAt(lineup, rotation = lineup.rotation) {
  const positions = {};
  const players = lineup.players.slice(0, 6);
  const normalizedRotation = ((rotation % 6) + 6) % 6;

  for (let position = 1; position <= 6; position++) {
    positions[position] = players[(position - 1 + normalizedRotation) % 6] || null;
  }

  return positions;
}

function underlyingIndex(position, rotation) {
  return (Number(position) - 1 + Number(rotation)) % 6;
}

function rotateLineup(lineup, amount) {
  lineup.rotation = (lineup.rotation + amount + 6) % 6;
  saveData();
  renderAll();
}

/* =========================
   COURT RENDERING
   ========================= */

function renderPlayerToken(player, position) {
  let avatar = '<div class="initial">?</div>';

  if (player) {
    avatar = player.photo
      ? `<img src="${escapeHTML(player.photo)}" alt="${escapeHTML(player.name)}">`
      : `<div class="initial">${escapeHTML(getInitials(player.name))}</div>`;
  }

  return `
    <div class="player-token">
      <div>${avatar}</div>
    </div>
    <div class="token-name">${player ? escapeHTML(player.name) : "Trống"}</div>
    <span class="position-number">${position}</span>
  `;
}

function courtMarkup(lineup) {
  const positions = positionsAt(lineup);

  return `
    <div class="court-wrap">
      <div class="court" aria-label="Sân bóng chuyền">
        <div class="opponent-zone">PHÍA ĐỐI THỦ</div>
        <div class="net"><span>LƯỚI</span></div>
        <div class="front-line"></div>
        ${[1, 2, 3, 4, 5, 6].map(position => `
          <div class="position p${position}"
               data-pos="${position}"
               draggable="true"
               role="button"
               tabindex="0"
               aria-label="Vị trí ${position}">
            ${renderPlayerToken(positions[position], position)}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLineups() {
  const grid = document.getElementById("lineupsGrid");
  const count = document.getElementById("lineupCount");

  if (!grid) return;

  if (count) count.textContent = `${lineups.length} ĐỘI HÌNH`;

  grid.innerHTML = lineups.map(lineup => `
    <article class="lineup-card ${lineup.id === selectedLineupId ? "lineup-selected" : ""}"
             data-id="${escapeHTML(lineup.id)}"
             data-color="${escapeHTML(lineup.color)}">

      <header class="lineup-card-header">
        <div class="lineup-title-wrap">
          <span class="lineup-color-dot"></span>
          <input class="lineup-name"
                 aria-label="Tên đội hình"
                 value="${escapeHTML(lineup.name)}"
                 maxlength="40">
        </div>
        <div class="lineup-actions">
          <button type="button" class="select-lineup" title="Chỉnh sửa đội hình"
                  aria-label="Chọn đội hình">✓</button>
          <button type="button" class="delete-lineup" title="Xóa đội hình"
                  aria-label="Xóa đội hình">×</button>
        </div>
      </header>

      <div class="lineup-subtitle">
        ROTATION ${lineup.rotation + 1} / 6
      </div>

      ${courtMarkup(lineup)}

      <div class="lineup-rotation-controls">
        <button type="button" class="prev-rotation" aria-label="Vòng trước">←</button>
        <div class="lineup-rotation-label">Vòng ${lineup.rotation + 1} / 6</div>
        <button type="button" class="next-rotation" aria-label="Vòng tiếp theo">→</button>
      </div>

      <div class="lineup-roster-summary">
        <span><strong>${lineup.players.length}</strong> cầu thủ</span>
        <span class="active-label">
          ${lineup.id === selectedLineupId ? "Đang chỉnh sửa" : "Chọn để chỉnh sửa"}
        </span>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".lineup-card").forEach(card => {
    const lineup = lineups.find(item => item.id === card.dataset.id);
    if (!lineup) return;

    const nameInput = card.querySelector(".lineup-name");

    nameInput.addEventListener("change", () => {
      lineup.name = nameInput.value.trim() || "Đội hình";
      nameInput.value = lineup.name;
      saveData();
      renderPlayers();
      renderRotationMap();
      renderLineups();
    });

    nameInput.addEventListener("click", event => event.stopPropagation());

    card.querySelector(".select-lineup").addEventListener("click", () => {
      selectedLineupId = lineup.id;
      saveData();
      renderAll();
    });

    card.querySelector(".delete-lineup").addEventListener("click", () => {
      if (lineups.length <= 1) {
        showToast("Bạn cần giữ ít nhất một đội hình.");
        return;
      }

      if (!confirm(`Bạn có chắc muốn xóa "${lineup.name}"?`)) return;

      lineups = lineups.filter(item => item.id !== lineup.id);

      if (selectedLineupId === lineup.id) {
        selectedLineupId = lineups[0].id;
      }

      saveData();
      renderAll();
      showToast("Đã xóa đội hình.");
    });

    card.querySelector(".prev-rotation").addEventListener("click", () => {
      rotateLineup(lineup, -1);
    });

    card.querySelector(".next-rotation").addEventListener("click", () => {
      rotateLineup(lineup, 1);
    });

    card.querySelector(".court").addEventListener("click", () => {
      if (selectedLineupId !== lineup.id) {
        selectedLineupId = lineup.id;
        saveData();
        renderAll();
      }
    });

    attachCourtDragDrop(card, lineup);
  });
}

/* =========================
   DRAG & DROP
   ========================= */

function attachCourtDragDrop(card, lineup) {
  const slots = card.querySelectorAll(".position");

  slots.forEach(slot => {
    slot.addEventListener("dragstart", event => {
      const position = Number(slot.dataset.pos);

      draggedPlayerId = null;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `slot:${position}:${lineup.id}`);

      slot.classList.add("dragging");
    });

    slot.addEventListener("dragend", () => {
      slot.classList.remove("dragging");
      slots.forEach(item => item.classList.remove("drag-over"));
    });

    slot.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", event => {
      event.preventDefault();
      event.stopPropagation();
      slot.classList.remove("drag-over");

      const data = event.dataTransfer.getData("text/plain");
      const targetPosition = Number(slot.dataset.pos);

      if (data.startsWith("player:")) {
        const parts = data.split(":");
        const playerId = parts[1];
        const sourceLineupId = parts[2];

        if (sourceLineupId !== lineup.id) {
          showToast("Hãy chọn cầu thủ trong cùng đội hình.");
          return;
        }

        swapRosterPlayerIntoPosition(lineup, playerId, targetPosition);
        return;
      }

      if (data.startsWith("slot:")) {
        const parts = data.split(":");
        const sourcePosition = Number(parts[1]);
        const sourceLineupId = parts[2];

        if (sourceLineupId !== lineup.id || sourcePosition === targetPosition) return;

        swapCourtPositions(lineup, sourcePosition, targetPosition);
      }
    });

    slot.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectedLineupId = lineup.id;
        renderAll();
      }
    });
  });
}

function swapRosterPlayerIntoPosition(lineup, playerId, position) {
  const sourceIndex = lineup.players.findIndex(player => player.id === playerId);
  const targetIndex = underlyingIndex(position, lineup.rotation);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

  const temporary = lineup.players[targetIndex];
  lineup.players[targetIndex] = lineup.players[sourceIndex];
  lineup.players[sourceIndex] = temporary;

  saveData();
  renderAll();
  showToast("Đã thay cầu thủ ở vị trí " + position + ".");
}

function swapCourtPositions(lineup, positionA, positionB) {
  const indexA = underlyingIndex(positionA, lineup.rotation);
  const indexB = underlyingIndex(positionB, lineup.rotation);

  if (indexA === indexB) return;

  const temporary = lineup.players[indexA];
  lineup.players[indexA] = lineup.players[indexB];
  lineup.players[indexB] = temporary;

  saveData();
  renderAll();
  showToast(`Đã đổi vị trí ${positionA} và ${positionB}.`);
}

/* =========================
   PLAYER ROSTER
   ========================= */

function renderPlayers() {
  const lineup = getSelectedLineup();
  const list = document.getElementById("playerList");
  const addButton = document.getElementById("addBtn");
  const label = document.getElementById("selectedLineupLabel");

  if (!lineup || !list) return;

  if (label) {
    label.textContent = `Đang quản lý: ${lineup.name} · ${lineup.players.length} cầu thủ`;
  }

  if (addButton) {
    addButton.textContent = "＋ Thêm cầu thủ";
  }

  if (!lineup.players.length) {
    list.innerHTML = '<p class="helper-text">Chưa có cầu thủ trong đội hình này.</p>';
    return;
  }

  list.innerHTML = lineup.players.map(player => {
    const avatar = player.photo
      ? `<img src="${escapeHTML(player.photo)}" alt="">`
      : escapeHTML(getInitials(player.name));

    return `
      <div class="player-item"
           data-id="${escapeHTML(player.id)}"
           draggable="true">
        <div class="player-avatar">${avatar}</div>
        <div class="player-meta">
          <strong>${escapeHTML(player.name)}</strong>
          <span>${escapeHTML(player.role)}</span>
        </div>
        <div class="shirt">#${escapeHTML(player.number)}</div>
        <div class="roster-actions">
          <button type="button" class="edit-player" title="Chỉnh sửa"
                  aria-label="Chỉnh sửa ${escapeHTML(player.name)}">✎</button>
          <button type="button" class="delete-player" title="Xóa"
                  aria-label="Xóa ${escapeHTML(player.name)}">×</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".player-item").forEach(item => {
    const playerId = item.dataset.id;

    item.addEventListener("dragstart", event => {
      draggedPlayerId = playerId;
      item.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `player:${playerId}:${lineup.id}`);
    });

    item.addEventListener("dragend", () => {
      draggedPlayerId = null;
      item.classList.remove("dragging");
    });

    item.querySelector(".edit-player").addEventListener("click", () => {
      openEditPlayer(playerId);
    });

    item.querySelector(".delete-player").addEventListener("click", () => {
      deletePlayer(playerId);
    });
  });
}

function renderRotationMap() {
  const holder = document.getElementById("rotationMap");
  const label = document.getElementById("rotationMapLabel");
  const lineup = getSelectedLineup();

  if (!holder || !lineup) return;

  if (label) label.textContent = `Đội hình: ${lineup.name}`;

  holder.innerHTML = "";

  for (let rotation = 0; rotation < 6; rotation++) {
    const positions = positionsAt(lineup, rotation);
    const card = document.createElement("div");

    card.className = "map-card" + (rotation === lineup.rotation ? " active" : "");

    card.innerHTML = `
      <h3>VÒNG ${rotation + 1}${rotation === lineup.rotation ? " · HIỆN TẠI" : ""}</h3>
      ${[4, 3, 2, 5, 6, 1].map(position => {
        const player = positions[position];

        return `
          <div class="map-player">
            <b>${position}</b>
            <div class="map-mini">${player ? escapeHTML(getInitials(player.name)) : "?"}</div>
            <span>${player ? escapeHTML(player.name) : "Trống"}</span>
          </div>
        `;
      }).join("")}
    `;

    card.addEventListener("click", () => {
      lineup.rotation = rotation;
      saveData();
      renderAll();
      showToast("Đã chuyển sang vòng " + (rotation + 1) + ".");
    });

    holder.appendChild(card);
  }
}

/* =========================
   ADD / EDIT / DELETE
   ========================= */

function addLineup() {
  const nextNumber = lineups.length + 1;
  const color = COLORS[lineups.length % COLORS.length];
  const selected = getSelectedLineup();

  /* Đội hình mới có danh sách riêng, không dùng chung dữ liệu với đội hình cũ. */
  const players = selected ? selected.players.map(player => ({
    ...player,
    id: makeId("player")
  })) : makePlayers();

  const lineup = makeLineup(`Đội hình ${nextNumber}`, color, players);
  lineups.push(lineup);
  selectedLineupId = lineup.id;

  saveData();
  renderAll();
  showToast("Đã thêm đội hình mới.");
}

function openAddPlayer() {
  editingPlayerId = null;

  document.getElementById("modalTitle").textContent = "Thêm cầu thủ";
  document.getElementById("playerSubmit").textContent = "Thêm cầu thủ";
  document.getElementById("playerForm").reset();
  document.getElementById("pNumber").value = getSelectedLineup()?.players.length + 1 || 1;
  document.getElementById("photoHint").textContent = "Ảnh là tùy chọn.";
  document.getElementById("playerModal").classList.remove("hidden");
  document.getElementById("pName").focus();
}

function openEditPlayer(playerId) {
  const lineup = getSelectedLineup();
  const player = lineup?.players.find(item => item.id === playerId);

  if (!player) return;

  editingPlayerId = playerId;

  document.getElementById("modalTitle").textContent = "Chỉnh sửa cầu thủ";
  document.getElementById("playerSubmit").textContent = "Lưu thay đổi";
  document.getElementById("pName").value = player.name;
  document.getElementById("pNumber").value = player.number;
  document.getElementById("pRole").value = player.role;
  document.getElementById("pPhoto").value = "";
  document.getElementById("photoHint").textContent =
    "Không chọn ảnh mới nếu muốn giữ ảnh hiện tại.";
  document.getElementById("playerModal").classList.remove("hidden");
}

function closePlayerModal() {
  document.getElementById("playerModal").classList.add("hidden");
  document.getElementById("playerForm").reset();
  editingPlayerId = null;
}

function deletePlayer(playerId) {
  const lineup = getSelectedLineup();
  const player = lineup?.players.find(item => item.id === playerId);

  if (!lineup || !player) return;

  if (!confirm(`Xóa ${player.name} khỏi ${lineup.name}?`)) return;

  lineup.players = lineup.players.filter(item => item.id !== playerId);

  saveData();
  renderAll();
  showToast("Đã xóa cầu thủ.");
}

function submitPlayerForm(event) {
  event.preventDefault();

  const lineup = getSelectedLineup();
  if (!lineup) return;

  const name = document.getElementById("pName").value.trim();
  const number = Number(document.getElementById("pNumber").value);
  const role = document.getElementById("pRole").value;
  const file = document.getElementById("pPhoto").files[0];

  if (!name) {
    showToast("Vui lòng nhập họ tên cầu thủ.");
    return;
  }

  const existing = editingPlayerId
    ? lineup.players.find(player => player.id === editingPlayerId)
    : null;

  const savePlayer = photo => {
    if (existing) {
      existing.name = name;
      existing.number = number;
      existing.role = role;

      if (photo !== null) existing.photo = photo;

      showToast("Đã cập nhật cầu thủ.");
    } else {
      lineup.players.push({
        id: makeId("player"),
        name,
        number,
        role,
        photo: photo || ""
      });

      showToast("Đã thêm cầu thủ.");
    }

    closePlayerModal();
    saveData();
    renderAll();
  };

  if (!file) {
    savePlayer(null);
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("Vui lòng chọn một file ảnh.");
    return;
  }

  /* Giảm kích thước ảnh để hạn chế đầy bộ nhớ localStorage. */
  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const maxSide = 500;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      savePlayer(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => showToast("Không đọc được ảnh đã chọn.");
    image.src = reader.result;
  };

  reader.onerror = () => showToast("Không thể đọc file ảnh.");
  reader.readAsDataURL(file);
}

/* =========================
   PRESENTATION MODE
   ========================= */

function setPresentationMode(enabled) {
  presentationMode = enabled;
  document.body.classList.toggle("presentation", enabled);

  const controls = document.getElementById("presentationControls");
  if (controls) controls.style.display = enabled ? "flex" : "none";

  updatePresentationLabel();

  if (enabled) {
    showToast("Trình chiếu: dùng phím ← → để xoay vòng.");
  }
}

function updatePresentationLabel() {
  const lineup = getSelectedLineup();
  const label = document.getElementById("presLabel");

  if (label && lineup) {
    label.textContent = `VÒNG ${lineup.rotation + 1} / 6`;
  }
}

function addPresentationButton() {
  const controlGrid = document.querySelector(".control-grid");
  if (!controlGrid || document.getElementById("presentationBtn")) return;

  const card = document.createElement("div");
  card.className = "control-card";
  card.innerHTML = `
    <label>HIỂN THỊ</label>
    <button id="presentationBtn" class="secondary-btn" type="button">
      ⛶ Trình chiếu sân
    </button>
  `;

  controlGrid.appendChild(card);

  document.getElementById("presentationBtn").addEventListener("click", () => {
    setPresentationMode(true);
  });
}

/* =========================
   GENERAL UI
   ========================= */

function showToast(message) {
  const element = document.getElementById("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2400);
}

function renderAll() {
  renderLineups();
  renderPlayers();
  renderRotationMap();
  updatePresentationLabel();
}

function bindEvents() {
  document.getElementById("addLineupBtn").addEventListener("click", addLineup);
  document.getElementById("addBtn").addEventListener("click", openAddPlayer);
  document.getElementById("saveBtn").addEventListener("click", () => saveData(true));
  document.getElementById("playerForm").addEventListener("submit", submitPlayerForm);
  document.getElementById("closeModal").addEventListener("click", closePlayerModal);

  document.getElementById("playerModal").addEventListener("click", event => {
    if (event.target.id === "playerModal") closePlayerModal();
  });

  document.getElementById("matchName").addEventListener("change", () => {
    saveData();
    showToast("Đã lưu tên giải đấu.");
  });

  document.getElementById("presPrev").addEventListener("click", () => {
    const lineup = getSelectedLineup();
    if (lineup) rotateLineup(lineup, -1);
  });

  document.getElementById("presNext").addEventListener("click", () => {
    const lineup = getSelectedLineup();
    if (lineup) rotateLineup(lineup, 1);
  });

  document.getElementById("presClose").addEventListener("click", () => {
    setPresentationMode(false);
  });

  document.addEventListener("keydown", event => {
    const target = event.target;
    const isTyping = target && (
      target.matches("input, textarea, select") ||
      target.isContentEditable
    );

    if (event.key === "Escape" && presentationMode) {
      setPresentationMode(false);
      return;
    }

    if (isTyping || !presentationMode) return;

    const lineup = getSelectedLineup();
    if (!lineup) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateLineup(lineup, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateLineup(lineup, -1);
    }
  });
}

/* =========================
   START
   ========================= */

function initialize() {
  lineups = readSavedData();

  if (!lineups.length) {
    lineups = [
      makeLineup("Đội hình 1", "orange"),
      makeLineup("Đội hình 2", "blue"),
      makeLineup("Đội hình 3", "teal")
    ];
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    selectedLineupId = saved?.selectedLineupId &&
      lineups.some(item => item.id === saved.selectedLineupId)
      ? saved.selectedLineupId
      : lineups[0].id;

    const savedMatchName = saved?.matchName;
    if (savedMatchName) {
      document.getElementById("matchName").value = savedMatchName;
    }
  } catch (error) {
    selectedLineupId = lineups[0].id;
  }

  addPresentationButton();
  bindEvents();
  renderAll();
  saveData();
}

initialize();
