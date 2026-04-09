const listaPadrao = [
  { ip: "10.127.212.227", nome: "Frios" },
  { ip: "10.127.212.231", nome: "01 A" },
  { ip: "10.127.212.230", nome: "01 B" },
  { ip: "10.127.212.245", nome: "05 A" },
  { ip: "10.127.212.236", nome: "06 B" },
  { ip: "10.127.212.229", nome: "09 A" },
  { ip: "10.127.212.235", nome: "10 B" },
  { ip: "10.127.212.228", nome: "13 A" },
  { ip: "10.127.212.234", nome: "14 B" },
  { ip: "10.127.212.233", nome: "16 A" },
  { ip: "10.127.212.237", nome: "18 A" },
  { ip: "10.127.212.238", nome: "18 B" },
  { ip: "10.127.212.226", nome: "Terminal 01" },
  { ip: "10.127.212.232", nome: "Terminal 07" },
  { ip: "10.127.212.239", nome: "Terminal 14" },
  { ip: "10.127.212.243", nome: "Terminal 15" },
  { ip: "10.127.212.244", nome: "Terminal 16" },
  { ip: "10.127.212.246", nome: "Terminal 18" },
  { ip: "10.127.212.247", nome: "Terminal 19" },
  { ip: "10.127.212.248", nome: "Terminal 20" },
  { ip: "10.127.212.249", nome: "Terminal 21" },
  { ip: "10.127.212.250", nome: "Terminal 22" },
  { ip: "10.127.212.251", nome: "Terminal 23" },
  { ip: "10.127.212.252", nome: "Terminal 24" },
];

const STORAGE_KEY = "monitor_gertec_final_v8";

// --- Modal Logic ---
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalFooter = document.getElementById("modal-footer");

function closeModal() {
  modal.style.display = "none";
  modalBackdrop.style.display = "none";
  modalTitle.innerHTML = "";
  modalBody.innerHTML = "";
  modalFooter.innerHTML = "";
}

function showModal({ type, title, message, defaultValue = "" }) {
  return new Promise((resolve, reject) => {
    modalTitle.innerText = title;
    let bodyHtml = `<p>${message}</p>`;
    if (type === "prompt") {
      bodyHtml += `<input type="text" id="modal-input" value="${defaultValue}">`;
    }
    modalBody.innerHTML = bodyHtml;

    const cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancelar";
    cancelButton.onclick = () => {
      closeModal();
      reject(new Error("Ação cancelada pelo usuário."));
    };

    const confirmButton = document.createElement("button");
    confirmButton.innerText = "Confirmar";
    confirmButton.className = "btn-save";
    confirmButton.onclick = () => {
      const value = type === "prompt" ? document.getElementById("modal-input").value : true;
      closeModal();
      resolve(value);
    };

    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(confirmButton);

    modal.style.display = "block";
    modalBackdrop.style.display = "block";

    if (type === "prompt") {
      document.getElementById("modal-input").focus();
    }
  });
}
// --- End Modal Logic ---

let dispositivos = JSON.parse(localStorage.getItem(STORAGE_KEY));

if (!dispositivos) {
  dispositivos = listaPadrao.map((item, index) => ({
    id: index,
    nome: item.nome,
    ip: item.ip,
    status: "verificando",
    latencia: 0,
    testes: 0,
    sucessos: 0,
    uptime: 100,
  }));
}

function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("themeBtn");
  body.classList.toggle("light-mode");
  const isLight = body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  btn.innerHTML = isLight
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
  document.getElementById("themeBtn").innerHTML =
    '<i class="fa-solid fa-sun"></i>';
}

function renderizar() {
  const painel = document.getElementById("painel");
  const filtro = document.getElementById("filtroStatus").value;
  let offCount = 0;
  painel.innerHTML = "";

  dispositivos.forEach((disp) => {
    if (disp.status === "offline") offCount++;
    if (filtro !== "todos" && disp.status !== filtro) return;

    const card = document.createElement("div");
    card.className = `card ${disp.status}`;
    card.innerHTML = `
                  <button class="edit-btn" onclick="editarCard(${disp.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                  <span style="font-weight:600; font-size:1.1em; display:block; margin-bottom:2px;">${disp.nome}</span>
                  <span style="color:var(--text-dim); font-size:0.85em; font-family:monospace;">${disp.ip}</span>
                  <div class="health-bar-bg"><div class="health-bar-fill" style="width: ${disp.uptime}%"></div></div>
                  <div class="stats-grid">
                      <div><i class="fa-solid fa-bolt" style="color:var(--accent-blue)"></i> ${disp.latencia}ms</div>
                      <div><i class="fa-solid fa-heart" style="color:var(--accent-blue)"></i> ${disp.uptime}%</div>
                      <div><b>${disp.status.toUpperCase()}</b></div>
                      <div>Falhas: ${disp.testes - disp.sucessos}</div>
                  </div>
              `;
    painel.appendChild(card);
  });
  // Cores aplicadas diretamente aqui para garantir o contraste
  document.getElementById("global-stats").innerHTML =
    `<span style="color:var(--success)">ON: ${dispositivos.length - offCount}</span> | 
               <span style="color:var(--danger)">OFF: ${offCount}</span>`;
}

async function verificarConexoes() {
  const sound = document.getElementById("alertSound");
  let houveNovaQueda = false;

  const tarefas = dispositivos.map(async (disp) => {
    const inicio = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const statusAnterior = disp.status;
    disp.testes++;

    try {
      await fetch(`http://${disp.ip}`, {
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      disp.latencia = Math.round(performance.now() - inicio);
      disp.status = "online";
      disp.sucessos++;
    } catch (e) {
      disp.status = "offline";
      disp.latencia = "---";
      if (statusAnterior === "online") houveNovaQueda = true;
    } finally {
      clearTimeout(timeoutId);
      disp.uptime =
        disp.testes > 0
          ? ((disp.sucessos / disp.testes) * 100).toFixed(1)
          : 100;
    }
  });

  await Promise.all(tarefas);
  if (houveNovaQueda) sound.play().catch(() => {});
  document.getElementById("update-timer").innerText =
    "Sincronizado em: " + new Date().toLocaleTimeString();
  renderizar();
}

async function resetarEstatisticas() {
    try {
        await showModal({
            type: 'confirm',
            title: 'Resetar Métricas',
            message: 'Tem certeza que deseja zerar as estatísticas de falhas e uptime de todos os dispositivos?',
        });

        dispositivos.forEach((d) => {
            d.testes = 0;
            d.sucessos = 0;
            d.uptime = 100;
            d.latencia = 0;
        });
        salvarNoNavegador();
        renderizar();

    } catch (error) {
        console.log("Ação cancelada: As métricas não foram resetadas.");
    }
}

async function editarCard(id) {
    const idx = dispositivos.findIndex((d) => d.id === id);
    if (idx === -1) return;
    
    const disp = dispositivos[idx];

    try {
        const novoNome = await showModal({
            type: 'prompt',
            title: `Editar Nome`,
            message: `Insira o novo nome para o dispositivo ${disp.ip}:`,
            defaultValue: disp.nome,
        });

        if (novoNome && novoNome.trim() !== "") {
            dispositivos[idx].nome = novoNome.trim();
            renderizar();
            salvarNoNavegador();
        }
    } catch (error) {
        console.log("Ação cancelada: O nome não foi alterado.");
    }
}

function salvarNoNavegador() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dispositivos));
}

// Initial Load
renderizar();
verificarConexoes();
setInterval(verificarConexoes, 20000);
