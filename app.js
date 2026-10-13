
/* Volley Planner - Multi Lineup Edition */
const STORAGE_KEY = "volleyPlannerMultiV1";
const ROSTER_UPDATE_KEY = "volleyRosterNamesUpdatedV2";

const DEFAULT_PLAYERS = [
  { id: "p1", name: "Nguyễn Tuấn Thành Cương", number: 1, role: "Setter", photo: "" },
  { id: "p2", name: "Đào Minh Tuấn", number: 2, role: "Outside Hitter", photo: "" },
  { id: "p3", name: "Trần Đức Uy", number: 3, role: "Outside Hitter", photo: "" },
  { id: "p4", name: "Dũng Thế Bình", number: 4, role: "Middle Blocker", photo: "" },
  { id: "p5", name: "Ngô Huy Khải", number: 5, role: "Middle Blocker", photo: "" },
  { id: "p6", name: "Nguyễn Thế Kỷ", number: 6, role: "Opposite", photo: "" },
  { id: "p7", name: "Dù Tiến Đạt", number: 7, role: "Outside Hitter", photo: "" },
  { id: "p8", name: "Tô Bọt Huy", number: 8, role: "Libero", photo: "" },
  { id: "p9", name: "Nguyễn Phú Trọng", number: 9, role: "Outside Hitter", photo: "" },
  { id: "p10", name: "Nguyễn Đình Cần", number: 10, role: "Setter", photo: "" },
  { id: "p11", name: "Bùi Phi Sơn", number: 11, role: "Opposite", photo: "" }
];

const COLORS = ["orange", "blue", "teal", "purple", "red", "gold"];

let editingPlayerId = null;
let draggedPlayerId = null;
let draggedFromPosition = null;
let presentationTimer = null;

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeLineup(name, color, players = DEFAULT_PLAYERS) {
  return {
    id: uid("lineup"),
    name,
    color,
    rotation: 0,
    players: players.map((player, index) => ({
      ...clone(player),
      id: uid(`p${index + 1}`)
    }))
  };
}

function mergeOfficialRoster(existingPlayers, lineupId) {
  const oldPlayers = Array.isArray(existingPlayers) ? existingPlayers : [];

  return DEFAULT_PLAYERS.map((player, index) => {
    const existing = oldPlayers.find(item =>
      String(item.name || "").trim().toLocaleLowerCase("vi") ===
      player.name.toLocaleLowerCase("vi")
    );

    return {
      ...player,
      id: existing?.id || `${lineupId}_player_${index + 1}`,
      number: existing?.number ?? player.number,
      role: existing?.role || player.role,
      photo: existing?.photo || ""
    };
  });
}

function loadData() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null"
    );

    if (saved?.lineups?.length) {
      return saved.lineups.map((lineup, index) => ({
        id: lineup.id || uid("lineup"),
        name: lineup.name || `Đội hình ${index + 1}`,
        color: lineup.color || COLORS[index % COLORS.length],
        rotation: Number.isInteger(lineup.rotation)
          ? ((lineup.rotation % 6) + 6) % 6
          : 0,
        players: Array.isArray(lineup.players)
          ? lineup.players
          : clone(DEFAULT_PLAYERS)
      }));
    }
  } catch (error) {
    console.warn("Không đọc được dữ liệu đội hình:", error);
  }

  try {
    const old = JSON.parse(
      localStorage.getItem("volleyPlannerV3") ||
      localStorage.getItem("volleyPlannerV1") ||
      "null"
    );

    if (old?.players?.length) {
      const first = makeLineup("Đội hình 1", "orange");
      first.players = mergeOfficialRoster(old.players, first.id);

      return [
        first,
        makeLineup("Đội hình 2", "blue"),
        makeLineup("Đội hình 3", "teal")
      ];
    }
  } catch (error) {
    console.warn("Không thể chuyển dữ liệu cũ:", error);
  }

  return [
    makeLineup("Đội hình 1", "orange"),
    makeLineup("Đội hình 2", "blue"),
    makeLineup("Đội hình 3", "teal")
  ];
}

let lineups = loadData();
let selectedLineupId = lineups[0]?.id;

function persistData(showMessage = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lineups }));
    if (showMessage) toast("Đã lưu dữ liệu đội hình.");
  } catch (error) {
    toast("Không thể lưu dữ liệu. Hãy thử ảnh có dung lượng nhỏ hơn.");
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
  return lineups.find(item => item.id === selectedLineupId) || lineups[0];
}

function positionsAt(lineup, rotation = lineup.rotation) {
  const positions = {};

  lineup.players.slice(0, 6).forEach((player, index) => {
    positions[index + 1] = player;
  });

  for (let index = 0; index < rotation; index++) {
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

function rosterIndexForPosition(position, rotation) {
  return (Number(position) - 1 + rotation) % 6;
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
    ? `<img src="${player.photo}" alt="${esc(player.name)}" draggable="false">`
    : `<div class="initial">${esc(initials(player.name))}</div>`;

  return `
    <div class="player-token">
      <div>${avatar}</div>
    </div>
    <div class="token-name">${esc(player.name)}</div>
    <div class="token-number">#${esc(player.number)}</div>
  `;
}

function courtMarkup(lineup) {
  const positions = positionsAt(lineup);

  return `
    <div class="court-wrap">
      <div class="court" aria-label="Sân bóng chuyền ${esc(lineup.name)}">
        <div class="opponent-zone">ĐỐI THỦ</div>
        <div class="net"><span>LƯỚI</span></div>
        <div class="front-line"></div>
        ${[1, 2, 3, 4, 5, 6].map(position => `
          <div
            class="position p${position}"
            data-pos="${position}"
            data-lineup-id="${esc(lineup.id)}"
            draggable="true"
            title="Kéo để đổi vị trí"
          >
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

  const count = document.getElementById("lineupCount");
  if (count) count.textContent = `${lineups.length} ĐỘI HÌNH`;

  grid.innerHTML = lineups.map(lineup => `
    <article
      class="lineup-card ${lineup.id === selectedLineupId ? "lineup-selected" : ""}"
      data-id="${esc(lineup.id)}"
      data-color="${esc(lineup.color)}"
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
        <div class="lineup-rotation-label">Vòng ${lineup.rotation + 1} / 6</div>
        <button type="button" class="next-rotation" aria-label="Vòng tiếp theo">→</button>
      </div>

      <div class="lineup-roster-summary">
        <span><strong>${lineup.players.length}</strong> cầu thủ</span>
        <span>${lineup.id === selectedLineupId ? "Đang chỉnh sửa" : "Chọn để chỉnh sửa"}</span>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".lineup-card").forEach(card => {
    const id = card.dataset.id;
    const lineup = lineups.find(item => item.id === id);
    if (!lineup) return;

    const nameInput = card.querySelector(".lineup-name");

    nameInput.addEventListener("change", event => {
      lineup.name = event.target.value.trim() || "Đội hình";
      persistData();
      renderLineups();
    });

    nameInput.addEventListener("click", event => event.stopPropagation());

    card.querySelector(".select-lineup").onclick = () => {
      selectedLineupId = id;
      renderAll();
    };

    card.querySelector(".delete-lineup").onclick = () => {
      if (lineups.length === 1) {
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
      renderAll();
    };

    card.querySelector(".next-rotation").onclick = () => {
      lineup.rotation = (lineup.rotation + 1) % 6;
      persistData();
      renderAll();
    };

    card.querySelector(".court").addEventListener("click", () => {
      if (selectedLineupId !== id) {
        selectedLineupId = id;
        renderAll();
      }
    });

    setupCourtDragDrop(card, lineup);
  });
}

function setupCourtDragDrop(card, lineup) {
  card.querySelectorAll(".position").forEach(slot => {
    slot.addEventListener("dragstart", event => {
      draggedFromPosition = {
        lineupId: lineup.id,
        position: Number(slot.dataset.pos)
      };

      draggedPlayerId = null;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `position:${slot.dataset.pos}`);
      slot.classList.add("dragging");
    });

    slot.addEventListener("dragend", () => {
      slot.classList.remove("dragging");
      card.querySelectorAll(".position").forEach(item => {
        item.classList.remove("drag-over");
      });
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
      slot.classList.remove("drag-over");

      const targetPosition = Number(slot.dataset.pos);
      const targetIndex = rosterIndexForPosition(targetPosition, lineup.rotation);

      if (
        draggedFromPosition &&
        draggedFromPosition.lineupId === lineup.id
      ) {
        const sourceIndex = rosterIndexForPosition(
          draggedFromPosition.position,
          lineup.rotation
        );

        if (
          sourceIndex !== targetIndex &&
          lineup.players[sourceIndex] &&
          lineup.players[targetIndex]
        ) {
          [
            lineup.players[sourceIndex],
            lineup.players[targetIndex]
          ] = [
            lineup.players[targetIndex],
            lineup.players[sourceIndex]
          ];

          persistData();
          renderAll();
        }
      } else if (draggedPlayerId) {
        const sourceIndex = lineup.players.findIndex(
          player => player.id === draggedPlayerId
        );

        if (sourceIndex >= 0 && sourceIndex !== targetIndex) {
          [
            lineup.players[sourceIndex],
            lineup.players[targetIndex]
          ] = [
            lineup.players[targetIndex],
            lineup.players[sourceIndex]
          ];

          persistData();
          renderAll();
        }
      }

      draggedFromPosition = null;
      draggedPlayerId = null;
    });
  });
}

function renderPlayers() {
  const lineup = getSelectedLineup();
  const list = document.getElementById("playerList");
  if (!lineup || !list) return;

  const addButton = document.getElementById("addBtn");
  if (addButton) {
    addButton.title = `Thêm cầu thủ vào ${lineup.name}`;
    addButton.setAttribute("aria-label", `Thêm cầu thủ vào ${lineup.name}`);
  }

  if (!lineup.players.length) {
    list.innerHTML = `
      <p class="helper-text">
        Chưa có cầu thủ. Hãy thêm cầu thủ vào đội hình này.
      </p>
    `;
    return;
  }

  list.innerHTML = lineup.players.map(player => {
    const avatar = player.photo
      ? `<img src="${player.photo}" alt="" draggable="false">`
      : esc(initials(player.name));

    return `
      <div class="player-item" data-id="${esc(player.id)}" draggable="true">
        <div class="player-avatar">${avatar}</div>
        <div class="player-meta">
          <strong>${esc(player.name)}</strong>
          <span>${esc(player.role || "Chưa chọn vị trí")}</span>
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

    item.addEventListener("dragstart", event => {
      draggedPlayerId = id;
      draggedFromPosition = null;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `player:${id}`);
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      draggedPlayerId = null;
    });
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

    card.addEventListener("click", () => {
      lineup.rotation = rotation;
      persistData();
      renderAll();
    });

    holder.appendChild(card);
  }
}

function renderAll() {
  renderLineups();
  renderPlayers();
  renderRotationMap();
  updateLegacyControls();
}

function updateLegacyControls() {
  const lineup = getSelectedLineup();
  if (!lineup) return;

  const setText = (id, text) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  };

  setText("playerCount", lineup.players.length);
  setText("currentLabel", `R${lineup.rotation + 1}`);
  setText("rotationNumber", lineup.rotation + 1);
  setText("courtTitle", `Rotation ${lineup.rotation + 1}`);
  setText("inlineRotationLabel", `ROTATION ${lineup.rotation + 1}`);
  setText("presLabel", `ROTATION ${lineup.rotation + 1}`);
  setText(
    "presTournament",
    document.getElementById("matchName")?.value || ""
  );

  const note = document.getElementById("rotationNote");
  if (note) {
    note.innerHTML = `
      <span>↻</span>
      <div>
        <b>Rotation ${lineup.rotation + 1}</b>
        <small>Vị trí 1 là người phát bóng.</small>
      </div>
    `;
  }

  ["rotationDots", "inlineRotationDots"].forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;

    element.innerHTML = Array.from({ length: 6 }, (_, index) => `
      <button
        type="button"
        class="rotation-dot ${index === lineup.rotation ? "active" : ""}"
        data-rotation="${index}"
        aria-label="Vòng ${index + 1}"
      ></button>
    `).join("");

    element.querySelectorAll("[data-rotation]").forEach(button => {
      button.onclick = () => {
        lineup.rotation = Number(button.dataset.rotation);
        persistData();
        renderAll();
      };
    });
  });
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2400);
}

function addLineup() {
  const lineup = makeLineup(
    `Đội hình ${lineups.length + 1}`,
    COLORS[lineups.length % COLORS.length]
  );

  lineups.push(lineup);
  selectedLineupId = lineup.id;

  persistData();
  renderAll();
  toast("Đã thêm đội hình mới.");
}

function openAdd() {
  editingPlayerId = null;

  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Thêm cầu thủ";

  const submit = document.getElementById("playerSubmit");
  if (submit) submit.textContent = "Thêm cầu thủ";

  document.getElementById("playerForm")?.reset();

  const number = document.getElementById("pNumber");
  if (number) number.value = getSelectedLineup().players.length + 1;

  document.getElementById("playerModal")?.classList.remove("hidden");
  document.getElementById("pName")?.focus();
}

function openEdit(id) {
  const player = getSelectedLineup()?.players.find(item => item.id === id);
  if (!player) return;

  editingPlayerId = id;

  const setValue = (key, value) => {
    const element = document.getElementById(key);
    if (element) element.value = value ?? "";
  };

  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Chỉnh sửa cầu thủ";

  const submit = document.getElementById("playerSubmit");
  if (submit) submit.textContent = "Lưu thay đổi";

  setValue("pName", player.name);
  setValue("pNumber", player.number);
  setValue("pRole", player.role);
  setValue("pPhoto", "");

  document.getElementById("playerModal")?.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("playerModal")?.classList.add("hidden");
  document.getElementById("playerForm")?.reset();
  editingPlayerId = null;
}

function deletePlayer(id) {
  const lineup = getSelectedLineup();
  const player = lineup?.players.find(item => item.id === id);
  if (!lineup || !player) return;

  if (!confirm(`Xóa cầu thủ ${player.name} khỏi "${lineup.name}"?`)) return;

  lineup.players = lineup.players.filter(item => item.id !== id);
  lineup.rotation = lineup.rotation % 6;

  persistData();
  renderAll();
  toast("Đã xóa cầu thủ.");
}

function savePlayer(event) {
  event.preventDefault();

  const lineup = getSelectedLineup();
  if (!lineup) return;

  const name = document.getElementById("pName").value.trim();
  const number = Number(document.getElementById("pNumber").value);
  const role = document.getElementById("pRole").value;
  const file = document.getElementById("pPhoto")?.files?.[0];

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
        id: uid("player"),
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
}

function changeRotation(delta) {
  const lineup = getSelectedLineup();
  if (!lineup) return;

  lineup.rotation = (lineup.rotation + delta + 6) % 6;
  persistData();
  renderAll();
}

function startPresentation() {
  document.body.classList.add("presentation");
  document.getElementById("presentationControls")?.classList.add("active");
}

function stopPresentation() {
  document.body.classList.remove("presentation");
  document.getElementById("presentationControls")?.classList.remove("active");

  if (presentationTimer) clearInterval(presentationTimer);
  presentationTimer = null;
}

function toggleAutoPresentation() {
  if (presentationTimer) {
    clearInterval(presentationTimer);
    presentationTimer = null;
    toast("Đã dừng tự động xoay vòng.");
    return;
  }

  presentationTimer = setInterval(() => changeRotation(1), 2500);
  toast("Đang tự động xoay vòng mỗi 2,5 giây.");
}

/* Kết nối các nút giao diện */
document.getElementById("addLineupBtn")?.addEventListener("click", addLineup);
document.getElementById("addBtn")?.addEventListener("click", openAdd);
document.getElementById("saveBtn")?.addEventListener("click", () => persistData(true));
document.getElementById("closeModal")?.addEventListener("click", closeModal);
document.getElementById("playerForm")?.addEventListener("submit", savePlayer);

document.getElementById("playerModal")?.addEventListener("click", event => {
  if (event.target.id === "playerModal") closeModal();
});

document.getElementById("matchName")?.addEventListener("change", event => {
  localStorage.setItem("volleyPlannerMatchName", event.target.value);
  toast("Đã lưu tên giải đấu.");
});

document.getElementById("teamName")?.addEventListener("change", event => {
  localStorage.setItem("volleyPlannerTeamName", event.target.value);
});

document.getElementById("resetBtn")?.addEventListener("click", () => {
  if (!confirm("Đặt lại toàn bộ đội hình về danh sách 11 VĐV mặc định?")) return;

  lineups = [
    makeLineup("Đội hình 1", "orange"),
    makeLineup("Đội hình 2", "blue"),
    makeLineup("Đội hình 3", "teal")
  ];

  selectedLineupId = lineups[0].id;
  persistData();
  renderAll();
  toast("Đã đặt lại danh sách đội hình.");
});

["prevBtn", "courtPrevBtn", "presPrev"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", () => changeRotation(-1));
});

["nextBtn", "courtNextBtn", "presNext"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", () => changeRotation(1));
});

document.getElementById("autoBtn")?.addEventListener("click", toggleAutoPresentation);
document.getElementById("presAuto")?.addEventListener("click", toggleAutoPresentation);
document.getElementById("fullscreenBtn")?.addEventListener("click", startPresentation);
document.getElementById("presClose")?.addEventListener("click", stopPresentation);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
    stopPresentation();
  }
});

/* Cập nhật danh sách 11 VĐV một lần, giữ thông tin trùng tên nếu có */
if (!localStorage.getItem(ROSTER_UPDATE_KEY)) {
  lineups.forEach(lineup => {
    lineup.players = mergeOfficialRoster(lineup.players, lineup.id);
  });

  localStorage.setItem(ROSTER_UPDATE_KEY, "true");
  persistData();
}

const matchNameInput = document.getElementById("matchName");
if (matchNameInput) {
  matchNameInput.value =
    localStorage.getItem("volleyPlannerMatchName") ||
    matchNameInput.value ||
    "Friendly Match";
}

const teamNameInput = document.getElementById("teamName");
if (teamNameInput) {
  teamNameInput.value =
    localStorage.getItem("volleyPlannerTeamName") ||
    teamNameInput.value ||
    "24H Volleyball";
}

renderAll();
