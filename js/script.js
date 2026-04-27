/* ==============================================
   GUIA COMERCIAL — script.js (VERSÃO FINALIZADA)
   ============================================== */

let lojistas = []; 
const containerGrid = document.getElementById("cardsGrid");

// 1. CARREGAMENTO DOS DADOS
async function carregarDadosLojistas() {
  try {
    // Usando caminho relativo para funcionar no GitHub Pages
    const resposta = await fetch("js/lojistas.json");
    if (!resposta.ok) throw new Error("Erro ao carregar JSON");

    lojistas = await resposta.json();

    // Filtramos apenas quem é destaque para a vitrine inicial
    const apenasDestaques = lojistas.filter((l) => l.isDestaque === true);
    const vitrineFinal = apenasDestaques.sort(() => Math.random() - 0.5).slice(0, 4);

    renderizarCards(vitrineFinal);
  } catch (erro) {
    console.error("Erro no carregamento:", erro);
  }
}

// 2. RENDERIZAÇÃO DOS CARDS
function renderizarCards(lista) {
  if (!containerGrid) return;
  containerGrid.innerHTML = "";

  if (lista.length === 0) {
    containerGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color: #666;">Nenhum lojista encontrado.</p>`;
    return;
  }

  lista.forEach((lojista) => {
    const cardHTML = `
        <article class="card-lojista" 
                 data-id="${lojista.id}" 
                 data-abre="${lojista.abre}" 
                 data-fecha="${lojista.fecha}" 
                 onclick="abrirModal(${lojista.id})">
            <div class="card-header">
                <img src="${lojista.imagemCapa}" alt="Capa ${lojista.nome}" class="card-banner" />
                <span class="status-badge">Verificando...</span>
            </div>
            <div class="card-content">
                <div class="logo-wrapper">
                    <img src="${lojista.logo}" alt="Logo ${lojista.nome}" />
                </div>
                
                <h3 class="lojista-nome">${lojista.nome}</h3>
                <div class="horario-info">
                    <i class="fa-regular fa-clock"></i>
                    <span>${lojista.horarioTexto}</span>
                </div>
                <p class="endereco">
                    <i class="fa-solid fa-location-dot"></i> ${lojista.endereco}
                </p>
                <p class="descricao">${lojista.descricao}</p>
                <div class="card-footer">
                    <span class="btn-detalhes">
                        <i class="fa-regular fa-eye"></i> Ver detalhes
                    </span>
                </div>
            </div>
        </article>
    `;
    containerGrid.innerHTML += cardHTML;
  });

  // Chama o status logo após criar os elementos
  atualizarStatusLojas();
}

// 3. LÓGICA DE STATUS
function atualizarStatusLojas() {
  const agora = new Date();
  const horaAtual = agora.getHours() * 100 + agora.getMinutes();
  const cards = document.querySelectorAll(".card-lojista");

  cards.forEach((card) => {
    const badge = card.querySelector(".status-badge");
    const abreStr = card.getAttribute("data-abre");
    const fechaStr = card.getAttribute("data-fecha");

    if (abreStr && fechaStr) {
      const hAbre = parseInt(abreStr.replace(":", ""));
      const hFecha = parseInt(fechaStr.replace(":", ""));

      if (horaAtual >= hAbre && horaAtual < hFecha) {
        badge.textContent = "Aberto Agora";
        badge.className = "status-badge aberto";
      } else {
        badge.textContent = "Fechado";
        badge.className = "status-badge fechado";
      }
    }
  });
}

// 4. MODAL
function abrirModal(id) {
  const lojista = lojistas.find((l) => l.id == id);
  if (!lojista) return;

  document.getElementById("modalNome").textContent = lojista.nome;
  document.getElementById("modalBanner").src = lojista.imagemCapa;
  document.getElementById("modalLogo").src = lojista.logo;
  document.getElementById("modalCategoria").textContent = lojista.categoria;
  document.getElementById("modalHorario").textContent = lojista.horarioTexto;
  document.getElementById("modalEndereco").textContent = lojista.endereco;
  document.getElementById("modalDescricao").textContent = lojista.descricao;

  const foneLimpo = lojista.linkWhats.replace(/\D/g, "");
  document.getElementById("linkWhatsModal").href = `https://wa.me/55${foneLimpo}`;
  document.getElementById("linkMapsModal").href = lojista.linkMaps;

  const modal = document.getElementById("modalDetalhes");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  const modal = document.getElementById("modalDetalhes");
  if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
  }
}

// 5. EVENTOS E INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosLojistas();

    const btnFechar = document.getElementById("fecharModal");
    if (btnFechar) btnFechar.addEventListener("click", fecharModal);

    window.addEventListener("click", (e) => {
      const modal = document.getElementById("modalDetalhes");
      if (e.target === modal) fecharModal();
    });
});