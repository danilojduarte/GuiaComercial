/* ==============================================
   GUIA COMERCIAL — script.js
   ============================================== */

let lojistas = []; // Começa vazio, será preenchido pelo arquivo JSON

// FUNÇÃO PARA BUSCAR OS DADOS EXTERNOS
async function carregarDadosLojistas() {
  try {
    const resposta = await fetch("/js/lojistas.json");
    if (!resposta.ok) throw new Error("Erro ao carregar JSON");

    lojistas = await resposta.json();

    // 1. Filtramos apenas quem é destaque
    const apenasDestaques = lojistas.filter((l) => l.isDestaque === true);

    // 2. Embaralhamos a lista (Sorteio)
    const destaquesSorteados = apenasDestaques.sort(() => Math.random() - 0.5);

    // 3. Pegamos apenas os 4 primeiros sorteados (para manter a grid bonita)
    const vitrineFinal = destaquesSorteados.slice(0, 4);

    renderizarCards(vitrineFinal);
  } catch (erro) {
    console.error("Erro no carregamento:", erro);
  }
}

/* -----------------------------------------------
   2. SELEÇÃO DE ELEMENTOS DO DOM
   ----------------------------------------------- */
const btnHamburger = document.getElementById("btnHamburger");
const menuMobile = document.getElementById("menuMobile");
const campoBusca = document.getElementById("campoBusca");
const btnBuscar = document.getElementById("btnBuscar");
const quickCards = document.querySelectorAll(".q-card");
const btnDropdown = document.getElementById("btnCategorias");
const containerGrid = document.querySelector(".cards-grid");
const areaFiltros = document.getElementById("area-filtros");
const btnLimparBusca = document.getElementById("btnLimparBusca");

/* -----------------------------------------------
   3. RENDERIZAÇÃO E STATUS (ABERTO/FECHADO)
   ----------------------------------------------- */

function renderizarCards(lista) {
  if (!containerGrid) return;
  containerGrid.innerHTML = "";

  if (lista.length === 0) {
    containerGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color: #666;">Nenhum lojista encontrado.</p>`;
    return;
  }

  lista.forEach((lojista) => {
    // AJUSTE: Adicionado onclick="abrirModal(${lojista.id})" no article
    const cardHTML = `
            <article class="card-lojista" data-abre="${lojista.abre}" data-fecha="${lojista.fecha}" onclick="abrirModal(${lojista.id})">
                <div class="card-header" style="background-image: url('${lojista.imagemCapa}');">
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

  atualizarStatusLojas();
}

function atualizarStatusLojas() {
  const agora = new Date();
  const horaAtual = agora.getHours() * 100 + agora.getMinutes();
  const cards = document.querySelectorAll(".card-lojista");

  cards.forEach((card) => {
    const badge = card.querySelector(".status-badge");
    if (!badge) return;

    const horaAbre = parseInt(card.getAttribute("data-abre").replace(":", ""));
    const horaFecha = parseInt(
      card.getAttribute("data-fecha").replace(":", ""),
    );

    if (horaAtual >= horaAbre && horaAtual < horaFecha) {
      badge.textContent = "Aberto Agora";
      badge.className = "status-badge aberto";
    } else {
      badge.textContent = "Fechado";
      badge.className = "status-badge fechado";
    }
  });
}

/* -----------------------------------------------
   4. SISTEMAS DE BUSCA E FILTRO
   ----------------------------------------------- */

function gerenciarBotaoVoltar(exibir) {
  if (areaFiltros) {
    areaFiltros.style.display = exibir ? "block" : "none";
  }
}

function executarBusca() {
  const termo = campoBusca.value.toLowerCase().trim();

  if (termo === "") {
    campoBusca.focus();
    campoBusca.classList.add("campo-erro");
    setTimeout(() => campoBusca.classList.remove("campo-erro"), 600);

    const apenasDestaques = lojistas.filter((l) => l.isDestaque === true);
    renderizarCards(apenasDestaques);
    gerenciarBotaoVoltar(false);
    return;
  }

  const resultados = lojistas.filter(
    (item) =>
      item.nome.toLowerCase().includes(termo) ||
      item.descricao.toLowerCase().includes(termo) ||
      item.categoria.toLowerCase().includes(termo) ||
      (item.keywords && item.keywords.toLowerCase().includes(termo)),
  );

  renderizarCards(resultados);
  gerenciarBotaoVoltar(true);
  containerGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (btnLimparBusca) {
  btnLimparBusca.addEventListener("click", () => {
    campoBusca.value = "";
    const apenasDestaques = lojistas.filter((l) => l.isDestaque === true);
    const destaquesSorteados = apenasDestaques.sort(() => Math.random() - 0.5);
    renderizarCards(destaquesSorteados.slice(0, 4));
    gerenciarBotaoVoltar(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

btnBuscar.addEventListener("click", executarBusca);
campoBusca.addEventListener("keydown", (e) => {
  if (e.key === "Enter") executarBusca();
});

quickCards.forEach((card) => {
  card.addEventListener("click", () => {
    const categoriaSelecionada = card.dataset.categoria.trim();
    if (categoriaSelecionada === "Todos") {
      const apenasDestaques = lojistas.filter((l) => l.isDestaque === true);
      renderizarCards(
        apenasDestaques.sort(() => Math.random() - 0.5).slice(0, 4),
      );
      gerenciarBotaoVoltar(false);
    } else {
      const filtrados = lojistas.filter((l) =>
        l.categoria.toLowerCase().includes(categoriaSelecionada.toLowerCase()),
      );
      renderizarCards(filtrados);
      gerenciarBotaoVoltar(true);
    }
    containerGrid.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

/* -----------------------------------------------
   5. LÓGICA DO MODAL DE DETALHES (NOVO)
   ----------------------------------------------- */

function abrirModal(id) {
  const lojista = lojistas.find((l) => l.id == id);
  if (!lojista) return;

  // Preenche os campos do modal
  document.getElementById("modalNome").textContent = lojista.nome;
  document.getElementById("modalBanner").src = lojista.imagemCapa;
  document.getElementById("modalLogo").src = lojista.logo;
  document.getElementById("modalCategoria").textContent = lojista.categoria;
  document.getElementById("modalHorario").textContent = lojista.horarioTexto;
  document.getElementById("modalEndereco").textContent = lojista.endereco;
  document.getElementById("modalDescricao").textContent = lojista.descricao;

  // Configura o link do WhatsApp com mensagem pronta
  const foneLimpo = lojista.linkWhats.replace(/\D/g, ""); // Remove ( ) - e espaços
  const mensagem = encodeURIComponent(
    `Olá ${lojista.nome}, vi seu anúncio no FindUsBairro e gostaria de mais informações!`,
  );
  document.getElementById("linkWhatsModal").href =
    `https://wa.me/55${foneLimpo}?text=${mensagem}`;

  // Configura o link do Maps
  document.getElementById("linkMapsModal").href = lojista.linkMaps;

  // Exibe o modal
  const modal = document.getElementById("modalDetalhes");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden"; // Impede o scroll do fundo
}

function fecharModal() {
  const modal = document.getElementById("modalDetalhes");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto"; // Devolve o scroll
}

// Fecha ao clicar no botão X
document.getElementById("fecharModal").addEventListener("click", fecharModal);

// Fecha ao clicar fora da caixa branca
window.addEventListener("click", (e) => {
  const modal = document.getElementById("modalDetalhes");
  if (e.target === modal) fecharModal();
});

/* -----------------------------------------------
   6. INTERFACE (MENU MOBILE, ESCAPE, EVENTOS)
   ----------------------------------------------- */

window.addEventListener("load", () => {
  carregarDadosLojistas();
});

if (btnHamburger && menuMobile) {
  btnHamburger.addEventListener("click", () => {
    const aberto = menuMobile.classList.toggle("aberto");
    btnHamburger.classList.toggle("ativo");
    btnHamburger.setAttribute("aria-expanded", aberto);
    menuMobile.setAttribute("aria-hidden", !aberto);
  });
}

document.addEventListener("click", (e) => {
  if (
    menuMobile &&
    menuMobile.classList.contains("aberto") &&
    !menuMobile.contains(e.target) &&
    !btnHamburger.contains(e.target)
  ) {
    menuMobile.classList.remove("aberto");
    btnHamburger.classList.remove("ativo");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    fecharModal(); // Também fecha o modal com a tecla ESC
    if (menuMobile) {
      menuMobile.classList.remove("aberto");
      btnHamburger.classList.remove("ativo");
    }
    if (document.activeElement === btnDropdown) btnDropdown.blur();
  }
});
