/* ==============================================
   GUIA COMERCIAL — script.js (VERSÃO CORRIGIDA)
   ============================================== */

let lojistas = [];
const containerGrid = document.getElementById("cardsGrid");

// Declaração das variáveis globais do DOM
// (FIX #1: declaradas no topo para evitar erros de referência)
const campoBusca = document.getElementById("campoBusca");
const btnBuscar = document.getElementById("btnBuscar");

/* ==============================================
   OTIMIZADOR DE IMAGENS — Cloudinary
   Detecta se a URL é do Cloudinary e injeta
   parâmetros automáticos de tamanho, qualidade
   e formato. URLs externas passam sem alteração.

   Perfis disponíveis:
   - "capa"  → 400×250px  — imagem do card
   - "logo"  → 80×80px    — logo circular do card
   - "banner"→ 800×300px  — banner do modal de detalhes
   - "noticia"→ 800×400px — imagem da notícia
   ============================================== */
function otimizarImagem(url, perfil = "capa") {
  if (!url || !url.includes("cloudinary.com")) return url;

  // Parâmetros por perfil: largura, altura, qualidade, crop
  const perfis = {
    capa:    "w_400,h_250,c_fill,q_auto,f_auto",
    logo:    "w_80,h_80,c_fill,q_auto,f_auto,r_max",
    banner:  "w_800,h_300,c_fill,q_auto,f_auto",
    noticia: "w_800,h_400,c_fill,q_auto,f_auto",
  };

  const params = perfis[perfil] || perfis.capa;

  // Insere os parâmetros após "/upload/" na URL do Cloudinary
  // Ex: https://res.cloudinary.com/demo/image/upload/sample.jpg
  //  →  https://res.cloudinary.com/demo/image/upload/w_400,h_250,c_fill,q_auto,f_auto/sample.jpg
  return url.replace("/upload/", `/upload/${params}/`);
}

// 1. CARREGAMENTO DOS DADOS
async function carregarDadosLojistas() {
  try {
    // Tenta carregar do sessionStorage primeiro (evita fetch repetido na mesma sessão)
    const cached = sessionStorage.getItem("guia_lojistas");
    if (cached) {
      lojistas = JSON.parse(cached);
    } else {
      const resposta = await fetch("js/lojistas.json");
      if (!resposta.ok) throw new Error("Erro ao carregar JSON");
      lojistas = await resposta.json();
      // Salva no cache da sessão para próximas navegações
      try { sessionStorage.setItem("guia_lojistas", JSON.stringify(lojistas)); } catch (_) {}
    }

    const apenasDestaques = lojistas.filter((l) => l.isDestaque === true);
    const vitrineFinal = apenasDestaques.sort(() => Math.random() - 0.5).slice(0, 4);

    renderizarCards(vitrineFinal);
  } catch (erro) {
    console.error("Erro no carregamento:", erro);
  }
}

// SCROLL SUAVE ATÉ A SEÇÃO DE CARDS
function scrollParaCards() {
  const grid = document.getElementById("cardsGrid");
  if (!grid) return;

  // Calcula a posição do grid descontando a altura da navbar fixa (80px)
  // para o primeiro card não ficar escondido atrás dela
  const navbar = document.querySelector(".navbar");
  const alturaNavbar = navbar ? navbar.offsetHeight : 70;
  const topo = grid.getBoundingClientRect().top + window.scrollY - alturaNavbar - 16;

  window.scrollTo({ top: topo, behavior: "smooth" });
}

// 2. RENDERIZAÇÃO DOS CARDS
function renderizarCards(lista, comScroll = false) {
  if (!containerGrid) return;
  containerGrid.innerHTML = "";

  if (lista.length === 0) {
    containerGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color: #666;">Nenhum lojista encontrado.</p>`;
    return;
  }

  // Usa DocumentFragment: monta todos os cards em memória e insere
  // no DOM de uma só vez — evita reconstruções a cada iteração
  const fragment = document.createDocumentFragment();

  lista.forEach((lojista) => {
    // Converte array de dias para string ex: "1,2,3,4,5" (padrão JS: 0=Dom...6=Sáb)
    const diasStr = Array.isArray(lojista.diasFuncionamento)
      ? lojista.diasFuncionamento.join(",")
      : "0,1,2,3,4,5,6"; // fallback: abre todos os dias

    // Cria o elemento via template — mais seguro e performático que innerHTML +=
    const template = document.createElement("template");
    template.innerHTML = `
      <article class="card-lojista"
               data-id="${lojista.id}"
               data-abre="${lojista.abre}"
               data-fecha="${lojista.fecha}"
               data-dias="${diasStr}"
               data-almoco-inicio="${lojista.almocoInicio || ''}"
               data-almoco-fim="${lojista.almocoFim || ''}">
        <div class="card-header">
          <img src="${otimizarImagem(lojista.imagemCapa, 'capa')}"
               alt="Capa ${lojista.nome}"
               class="card-banner"
               width="400" height="250"
               loading="lazy" />
          <span class="status-badge">Verificando...</span>
        </div>
        <div class="card-content">
          <div class="logo-wrapper">
            <img src="${otimizarImagem(lojista.logo, 'logo')}"
                 alt="Logo ${lojista.nome}"
                 width="80" height="80"
                 loading="lazy" />
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
      </article>`.trim();

    const card = template.content.firstElementChild;

    // Evento de clique adicionado via JS (sem onclick inline — melhor prática)
    card.addEventListener("click", () => abrirModal(lojista.id));

    fragment.appendChild(card);
  });

  // Uma única inserção no DOM — muito mais eficiente
  containerGrid.appendChild(fragment);

  atualizarStatusLojas();

  if (comScroll) scrollParaCards();
}

// 3. LÓGICA DE STATUS
// Suporta horário de almoço via campos opcionais:
// data-almoco-inicio e data-almoco-fim no card
// Ex: "12:00" e "13:30" — lojista fechado nesse intervalo
function atualizarStatusLojas() {
  const agora = new Date();
  const horaAtual = agora.getHours() * 100 + agora.getMinutes();
  const diaSemanaAtual = agora.getDay(); // 0=Dom, 1=Seg ... 6=Sáb
  const cards = document.querySelectorAll(".card-lojista");

  cards.forEach((card) => {
    const badge = card.querySelector(".status-badge");
    const abreStr  = card.getAttribute("data-abre");
    const fechaStr = card.getAttribute("data-fecha");
    const diasStr  = card.getAttribute("data-dias");
    const almocoInicioStr = card.getAttribute("data-almoco-inicio");
    const almocoFimStr    = card.getAttribute("data-almoco-fim");

    if (!abreStr || !fechaStr) return;

    const hAbre  = parseInt(abreStr.replace(":", ""));
    const hFecha = parseInt(fechaStr.replace(":", ""));

    const diasFuncionamento = diasStr
      ? diasStr.split(",").map(Number)
      : [0, 1, 2, 3, 4, 5, 6];

    const funcionaHoje   = diasFuncionamento.includes(diaSemanaAtual);
    const dentroDoHorario = horaAtual >= hAbre && horaAtual < hFecha;

    // Verifica se está no intervalo de almoço
    let noAlmoco = false;
    if (almocoInicioStr && almocoFimStr) {
      const hAlmocoInicio = parseInt(almocoInicioStr.replace(":", ""));
      const hAlmocoFim    = parseInt(almocoFimStr.replace(":", ""));
      noAlmoco = horaAtual >= hAlmocoInicio && horaAtual < hAlmocoFim;
    }

    if (!funcionaHoje) {
      badge.textContent = "Fechado Hoje";
      badge.className   = "status-badge fechado";
    } else if (funcionaHoje && dentroDoHorario && noAlmoco) {
      badge.textContent = "Fechado — Almoço";
      badge.className   = "status-badge almoco";
    } else if (funcionaHoje && dentroDoHorario) {
      badge.textContent = "Aberto Agora";
      badge.className   = "status-badge aberto";
    } else {
      badge.textContent = "Fechado";
      badge.className   = "status-badge fechado";
    }
  });
}

// 4. MODAL
function abrirModal(id) {
  const lojista = lojistas.find((l) => l.id == id);
  if (!lojista) return;

  document.getElementById("modalNome").textContent = lojista.nome;
  document.getElementById("modalBanner").src = otimizarImagem(lojista.imagemCapa, "banner");
  document.getElementById("modalLogo").src = otimizarImagem(lojista.logo, "logo");
  document.getElementById("modalCategoria").textContent = lojista.categoria;
  document.getElementById("modalHorario").textContent = lojista.horarioTexto;
  document.getElementById("modalEndereco").textContent = lojista.endereco;
  document.getElementById("modalDescricao").textContent = lojista.descricao;

  const foneLimpo = lojista.linkWhats.replace(/\D/g, "");
  document.getElementById("linkWhatsModal").href = `https://wa.me/55${foneLimpo}`;
  document.getElementById("linkMapsModal").href = lojista.linkMaps;

  // Instagram — adicionado no modal pelo usuário
  const linkInsta = document.getElementById("linkInstaModal");
  if (linkInsta) linkInsta.href = lojista.linkInsta || "#";

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

/* ==============================================
   LÓGICA DA BARRA DE BUSCA
   ============================================== */

function realizarBusca() {
  const termo = campoBusca.value.toLowerCase().trim();
  const areaFiltros = document.getElementById("area-filtros");

  // Esconde o teclado virtual no mobile ao realizar a busca
  if (campoBusca) campoBusca.blur();

  // Se vazio, volta aos destaques e esconde o botão de limpar
  if (termo === "") {
    const apenasDestaques = lojistas.filter((l) => l.isDestaque);
    renderizarCards(apenasDestaques);
    if (areaFiltros) areaFiltros.style.display = "none";
    return;
  }

  // Busca nos campos: nome, descrição, categoria e keywords
  const resultados = lojistas.filter((lojista) => {
    return (
      lojista.nome.toLowerCase().includes(termo) ||
      lojista.descricao.toLowerCase().includes(termo) ||
      lojista.categoria.toLowerCase().includes(termo) ||
      (lojista.keywords && lojista.keywords.toLowerCase().includes(termo))
    );
  });

  // Nenhum resultado → abre modal de "não encontrado"
  if (resultados.length === 0) {
    abrirModalNaoEncontrado(campoBusca.value.trim());
    return;
  }

  renderizarCards(resultados, true);

  // Exibe o botão "Mostrar todos" após uma busca
  if (areaFiltros) areaFiltros.style.display = "block";
}

/* ==============================================
   MODAL DE "NÃO ENCONTRADO"
   ============================================== */

function abrirModalNaoEncontrado(termoBuscado) {
  const sugestoes = ["Padaria", "Farmácia", "Mecânica", "Mercado", "PetShop", "Pintor", "Ar-condicionado", "Ótica"];
  const sugestoesHTML = sugestoes
    .map(s => `<button class="sugestao-tag" onclick="buscarSugestao('${s}')">${s}</button>`)
    .join("");

  // Trunca o termo se for muito longo para não quebrar o layout
  const termoExibido = termoBuscado.length > 20
    ? termoBuscado.substring(0, 20) + "..."
    : termoBuscado;

  const modalHTML = `
    <div class="modal-overlay" id="modalNaoEncontrado" style="display:flex;" aria-modal="true" role="dialog">
      <div class="modal-nao-encontrado">

        <button class="btn-fechar-nao-encontrado" id="fecharNaoEncontrado" aria-label="Fechar">&times;</button>

        <!-- Ícone -->
        <div class="nao-encontrado-icone">🔍</div>

        <!-- Título -->
        <h2 class="nao-encontrado-titulo">Ops! Nada encontrado</h2>

        <!-- Texto explicativo — sem o termo para não quebrar o layout -->
        <p class="nao-encontrado-texto">
          Não encontramos resultados para <strong>"${termoExibido}"</strong>.
          Mas não se preocupe — nossa equipe será notificada para buscar esse tipo de comércio para você!
        </p>

        <!-- Badge verde simplificado — só ícone + texto fixo, sem o termo -->
        <div class="nao-encontrado-info">
          <i class="fa-solid fa-circle-check"></i>
          <span>Sugestão enviada ao suporte!</span>
        </div>

        <!-- Sugestões de busca -->
        <p class="nao-encontrado-sugestao-titulo">Que tal tentar uma dessas?</p>
        <div class="sugestoes-wrap">${sugestoesHTML}</div>

        <!-- Botão de voltar -->
        <button class="btn-voltar-principal" id="btnVoltarPrincipal">
          <i class="fa-solid fa-arrow-left"></i> Voltar ao início
        </button>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  document.body.style.overflow = "hidden";

  document.getElementById("fecharNaoEncontrado").addEventListener("click", fecharModalNaoEncontrado);
  document.getElementById("btnVoltarPrincipal").addEventListener("click", fecharModalNaoEncontrado);
  document.getElementById("modalNaoEncontrado").addEventListener("click", (e) => {
    if (e.target.id === "modalNaoEncontrado") fecharModalNaoEncontrado();
  });
}

function fecharModalNaoEncontrado() {
  const modal = document.getElementById("modalNaoEncontrado");
  if (modal) {
    modal.remove();
    document.body.style.overflow = "auto";
    if (campoBusca) campoBusca.value = "";
    const apenasDestaques = lojistas.filter((l) => l.isDestaque);
    renderizarCards(apenasDestaques);
  }
}

function buscarSugestao(termo) {
  fecharModalNaoEncontrado();
  if (campoBusca) campoBusca.value = termo;
  realizarBusca();
}

// Evento de clique no botão de busca
if (btnBuscar) {
  btnBuscar.addEventListener("click", (e) => {
    e.preventDefault();
    realizarBusca();
  });
}

// Evento de apertar "Enter" no campo de busca
if (campoBusca) {
  campoBusca.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      realizarBusca();
    }
  });
}

// 5. EVENTOS E INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosLojistas();
  registrarFiltrosCategorias();
  inicializarNoticias();

  // Preenche o ano atual no footer dinamicamente
  const anoAtual = document.getElementById("anoAtual");
  if (anoAtual) anoAtual.textContent = new Date().getFullYear();

  // Inicializa animações após o primeiro frame pintado
  requestAnimationFrame(() => {
    inicializarScrollReveal();
    inicializarContadores();
  });

  // Fechar modal pelo botão X
  const btnFechar = document.getElementById("fecharModal");
  if (btnFechar) btnFechar.addEventListener("click", fecharModal);

  // Fechar modal clicando fora
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("modalDetalhes");
    if (e.target === modal) fecharModal();
  });

  // FIX #2: Lógica do menu hambúrguer (estava completamente ausente)
  const btnHamburger = document.getElementById("btnHamburger");
  const menuMobile = document.getElementById("menuMobile");

  if (btnHamburger && menuMobile) {
    btnHamburger.addEventListener("click", () => {
      const estaAberto = menuMobile.classList.toggle("aberto");
      btnHamburger.classList.toggle("ativo", estaAberto);
      btnHamburger.setAttribute("aria-expanded", estaAberto);
      menuMobile.setAttribute("aria-hidden", !estaAberto);
    });

    // Fecha o menu ao clicar em qualquer link dentro dele
    menuMobile.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuMobile.classList.remove("aberto");
        btnHamburger.classList.remove("ativo");
        btnHamburger.setAttribute("aria-expanded", "false");
        menuMobile.setAttribute("aria-hidden", "true");
      });
    });
  }

  // FIX #5: Botão "Mostrar todos os destaques" agora tem listener
  const btnLimparBusca = document.getElementById("btnLimparBusca");
  const areaFiltros = document.getElementById("area-filtros");

  if (btnLimparBusca) {
    btnLimparBusca.addEventListener("click", () => {
      if (campoBusca) campoBusca.value = "";
      const apenasDestaques = lojistas.filter((l) => l.isDestaque);
      renderizarCards(apenasDestaques);
      if (areaFiltros) areaFiltros.style.display = "none";

      // Remove destaque dos botões de filtro
      document.querySelectorAll(".btn-categoria").forEach((b) => b.classList.remove("ativo"));
    });
  }
});

/* ==============================================
   LÓGICA DE FILTROS POR CATEGORIA
   (registrada após DOMContentLoaded para pegar
    tanto os quick-cards quanto o dropdown da nav)
   ============================================== */

function registrarFiltrosCategorias() {
  // Seleciona quick-cards E links do dropdown — todos têm .btn-categoria
  const botoesFiltro = document.querySelectorAll(".btn-categoria");

  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", (e) => {
      e.preventDefault(); // Evita o href="#" rolar para o topo
      const categoriaSelecionada = botao.getAttribute("data-categoria");
      const areaFiltros = document.getElementById("area-filtros");

      if (categoriaSelecionada === "Todos") {
        renderizarCards(lojistas, true);
      } else {
        const filtrados = lojistas.filter(
          (l) => l.categoria.toLowerCase() === categoriaSelecionada.toLowerCase()
        );
        renderizarCards(filtrados, true);
      }

      // Mostra o botão "Mostrar todos" e marca o botão ativo
      if (areaFiltros) areaFiltros.style.display = "block";
      botoesFiltro.forEach((b) => b.classList.remove("ativo"));
      botao.classList.add("ativo");

      // Fecha o dropdown da navbar (desktop)
      const btnCategorias = document.getElementById("btnCategorias");
      if (btnCategorias) {
        btnCategorias.blur();
        btnCategorias.setAttribute("aria-expanded", "false");
      }

      // Fecha o menu mobile se estiver aberto
      const menuMobile = document.getElementById("menuMobile");
      const btnHamburger = document.getElementById("btnHamburger");
      if (menuMobile && menuMobile.classList.contains("aberto")) {
        menuMobile.classList.remove("aberto");
        menuMobile.setAttribute("aria-hidden", "true");
        if (btnHamburger) {
          btnHamburger.classList.remove("ativo");
          btnHamburger.setAttribute("aria-expanded", "false");
        }
      }
    });
  });
}






function fecharModalNoticia() {
  const modal = document.getElementById("modalNoticia");
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
  }
}
 
/* ==============================================
   MÓDULO DE NOTÍCIAS
   As notícias são definidas no index.html via
   window.noticias = [...] — edite lá facilmente.
   ============================================== */

let noticiaAtiva = null;

function inicializarNoticias() {
  const lista = document.getElementById("noticiaLista");
  if (!lista) return;

  // Lê o array definido no HTML
  const dados = window.noticias || [];
  if (dados.length === 0) return;

  // Renderiza os itens da lista lateral
  dados.forEach((noticia) => {
    const item = document.createElement("div");
    item.className = "noticia-item";
    item.setAttribute("role", "listitem");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-label", noticia.titulo);
    item.dataset.id = noticia.id;

    item.innerHTML = `
      <img src="${otimizarImagem(noticia.imagem, 'capa')}" alt="${noticia.titulo}" loading="lazy" />
      <div class="noticia-item-info">
        <span class="noticia-item-categoria">${noticia.categoria}</span>
        <span class="noticia-item-titulo">${noticia.titulo}</span>
        <span class="noticia-item-data">${noticia.data}</span>
      </div>
    `;

    item.addEventListener("click", () => {
      // Mobile (< 900px): abre modal direto — painel destaque está oculto
      if (window.innerWidth < 900) {
        abrirModalNoticia(noticia.id);
      } else {
        selecionarNoticia(noticia.id);
      }
    });
    item.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        if (window.innerWidth < 900) {
          abrirModalNoticia(noticia.id);
        } else {
          selecionarNoticia(noticia.id);
        }
      }
    });

    lista.appendChild(item);
  });

  // Seleciona a primeira notícia por padrão
  selecionarNoticia(dados[0].id);

  // Botão "Ler notícia completa"
  const btnLer = document.getElementById("destaqueBtnLer");
  if (btnLer) {
    btnLer.addEventListener("click", () => {
      if (noticiaAtiva) abrirModalNoticia(noticiaAtiva.id);
    });
  }

  // Fechar modal da notícia — botão X (desktop) e botão Voltar (mobile)
  const btnFecharNoticia = document.getElementById("fecharModalNoticia");
  if (btnFecharNoticia) btnFecharNoticia.addEventListener("click", fecharModalNoticia);

  const btnVoltarNoticia = document.getElementById("btnVoltarNoticia");
  if (btnVoltarNoticia) btnVoltarNoticia.addEventListener("click", fecharModalNoticia);

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("modalNoticia");
    if (e.target === modal) fecharModalNoticia();
  });
}

function selecionarNoticia(id) {
  const dados = window.noticias || [];
  const noticia = dados.find((n) => n.id === id);
  if (!noticia) return;
  noticiaAtiva = noticia;

  // Atualiza o painel de destaque
  document.getElementById("destaqueImagem").src = otimizarImagem(noticia.imagem, "noticia");
  document.getElementById("destaqueImagem").alt = noticia.titulo;
  document.getElementById("destaqueCategoria").textContent = noticia.categoria;
  document.getElementById("destaqueTitulo").textContent = noticia.titulo;
  document.getElementById("destaqueData").textContent = noticia.data;
  document.getElementById("destaqueResumo").textContent = noticia.resumo;

  // Reinicia animação de entrada
  const destaque = document.getElementById("noticiaDestaque");
  destaque.style.animation = "none";
  destaque.offsetHeight;
  destaque.style.animation = "";

  // Marca item ativo na lista
  document.querySelectorAll(".noticia-item").forEach((item) => {
    item.classList.toggle("ativo", parseInt(item.dataset.id) === id);
  });
}

function abrirModalNoticia(id) {
  const dados = window.noticias || [];
  const noticia = dados.find((n) => n.id === id);
  if (!noticia) return;

  document.getElementById("modalNoticiaImagem").src = otimizarImagem(noticia.imagem, "noticia");
  document.getElementById("modalNoticiaImagem").alt = noticia.titulo;
  document.getElementById("modalNoticiaCategoria").textContent = noticia.categoria;
  document.getElementById("modalNoticiaTitulo").textContent = noticia.titulo;
  document.getElementById("modalNoticiaData").textContent = noticia.data;
  document.getElementById("modalNoticiaTexto").textContent = noticia.textoCompleto;

  const modal = document.getElementById("modalNoticia");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // Sempre volta ao topo do modal ao abrir uma nova notícia
  const conteudo = modal.querySelector(".modal-noticia-content");
  if (conteudo) conteudo.scrollTop = 0;
}

function fecharModalNoticia() {
  const modal = document.getElementById("modalNoticia");
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
  }
}


/* ==============================================
   BOTÃO FLUTUANTE — VOLTAR AO TOPO
   ============================================== */

(function () {
  const btn = document.getElementById("btnVoltarTopo");
  if (!btn) return;

  // Throttle: limita o scroll a disparar no máximo 1x a cada 100ms
  // evita processamento excessivo em scrolls rápidos
  let scrollTimer = null;
  window.addEventListener("scroll", () => {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      if (window.scrollY > 300) {
        btn.classList.add("visivel");
      } else {
        btn.classList.remove("visivel");
      }
    }, 100);
  }, { passive: true });

  // Clique: scroll suave até o hero (topo da página)
  btn.addEventListener("click", () => {
    const hero = document.querySelector(".hero");
    if (hero) {
      hero.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
})();

/* ==============================================
   ANIMAÇÕES — Guia Comercial
   ============================================== */

// ── 1. SCROLL REVEAL ──
// Usa IntersectionObserver para detectar quando elementos
// entram na viewport e aplica a classe .visivel neles.

function inicializarScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visivel");
          // Para de observar após revelar (animação roda só 1x)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,   // 12% do elemento visível já dispara
      rootMargin: "0px 0px -40px 0px", // margem extra no fundo
    }
  );

  // Adiciona .reveal nos títulos das seções para animar a linha
  document.querySelectorAll(".section-title").forEach((el) => {
    observer.observe(el);
  });

  // Adiciona .reveal nos subtítulos das seções
  document.querySelectorAll(".section-subtitle").forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });

  // Cards de lojista — revelados em grupo com delay escalonado
  function observarCards() {
    const grid = document.getElementById("cardsGrid");
    if (!grid) return;

    grid.classList.add("reveal-group");
    grid.querySelectorAll(".card-lojista").forEach((card) => {
      card.classList.add("reveal");
      observer.observe(card);
    });
  }

  // Observa o grid ao carregar e também após cada renderização
  observarCards();

  // MutationObserver: re-aplica reveal sempre que novos cards forem renderizados
  const gridEl = document.getElementById("cardsGrid");
  if (gridEl) {
    const mutationObs = new MutationObserver(() => {
      gridEl.classList.add("reveal-group");
      gridEl.querySelectorAll(".card-lojista:not(.reveal)").forEach((card) => {
        card.classList.add("reveal");
        observer.observe(card);
      });
    });
    mutationObs.observe(gridEl, { childList: true });
  }

  // Itens de notícia
  document.querySelectorAll(".noticia-item").forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });

  // Painel destaque de notícia
  const destaque = document.getElementById("noticiaDestaque");
  if (destaque) {
    destaque.classList.add("reveal");
    observer.observe(destaque);
  }

  // Colunas do footer
  document.querySelectorAll(".footer-col").forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });

  // Linha de copyright do footer
  const footerBottom = document.querySelector(".footer-bottom");
  if (footerBottom) {
    footerBottom.classList.add("reveal");
    observer.observe(footerBottom);
  }
}

// ── 2. CONTADOR ANIMADO ──
// Anima qualquer elemento com data-contador="número"
// Ex: <span data-contador="150">0</span>
// Conta do 0 até o valor alvo com easing suave.

function animarContador(el) {
  const alvo = parseInt(el.getAttribute("data-contador"), 10);
  const duracao = 1800; // ms
  const inicio = performance.now();

  function tick(agora) {
    const progresso = Math.min((agora - inicio) / duracao, 1);
    // Easing: easeOutQuart — começa rápido, termina devagar
    const ease = 1 - Math.pow(1 - progresso, 4);
    el.textContent = Math.floor(ease * alvo).toLocaleString("pt-BR");
    if (progresso < 1) requestAnimationFrame(tick);
    else el.textContent = alvo.toLocaleString("pt-BR");
  }

  requestAnimationFrame(tick);
}

function inicializarContadores() {
  const contadores = document.querySelectorAll("[data-contador]");
  if (contadores.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animarContador(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  contadores.forEach((el) => observer.observe(el));
}

// ── INICIALIZAÇÃO ──
// Roda após o DOM estar pronto, mas aguarda
// um frame extra para garantir que tudo foi pintado.

// inicializarScrollReveal e inicializarContadores são chamados
// dentro do DOMContentLoaded principal — ver bloco acima.

/* ==============================================
   MÓDULO DE GEOLOCALIZAÇÃO
   Usa a Geolocation API nativa do navegador.
   Ao clicar no botão, pede permissão, calcula a
   distância até cada lojista (fórmula de Haversine)
   e exibe apenas os que estão dentro do raio definido.
   ============================================== */

// Raio padrão de busca em km — ajuste conforme necessário
const RAIO_KM = 3;

// Guarda a localização atual do usuário para uso posterior
let localizacaoUsuario = null;

/**
 * Fórmula de Haversine — calcula a distância em km
 * entre dois pontos geográficos (lat/lng).
 */
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formata a distância para exibição amigável:
 * abaixo de 1km mostra em metros, acima mostra em km.
 */
function formatarDistancia(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * Filtra os lojistas dentro do raio e os ordena
 * do mais próximo ao mais distante.
 * Também injeta o badge de distância em cada card após renderizar.
 */
function filtrarPorProximidade(lat, lng) {
  const areaFiltros = document.getElementById("area-filtros");

  // Calcula distância e filtra pelo raio
  const proximos = lojistas
    .filter((l) => l.latitude && l.longitude)
    .map((l) => ({
      ...l,
      distanciaKm: calcularDistanciaKm(lat, lng, l.latitude, l.longitude),
    }))
    .filter((l) => l.distanciaKm <= RAIO_KM)
    .sort((a, b) => a.distanciaKm - b.distanciaKm);

  // Renderiza os cards com scroll automático
  renderizarCards(proximos, true);

  // Exibe o botão "Mostrar todos"
  if (areaFiltros) areaFiltros.style.display = "block";

  // Injeta o badge de distância dentro do card-footer, abaixo do botão "Ver detalhes"
  requestAnimationFrame(() => {
    document.querySelectorAll(".card-lojista").forEach((card) => {
      const id = parseInt(card.dataset.id);
      const lojista = proximos.find((l) => l.id === id);
      if (!lojista) return;

      // Remove badge anterior se existir (evita duplicatas)
      card.querySelectorAll(".distancia-badge").forEach(b => b.remove());

      // Insere dentro do .card-footer, após o botão "Ver detalhes"
      const cardFooter = card.querySelector(".card-footer");
      if (!cardFooter) return;

      const badge = document.createElement("span");
      badge.className = "distancia-badge";
      badge.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${formatarDistancia(lojista.distanciaKm)} de você`;
      cardFooter.appendChild(badge);
    });
  });

  // Mensagem quando nenhum lojista for encontrado no raio
  if (proximos.length === 0) {
    const grid = document.getElementById("cardsGrid");
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">
          <i class="fa-solid fa-location-dot" style="font-size:2rem; color:var(--cor-primaria); margin-bottom:12px; display:block;"></i>
          <strong>Nenhum lojista encontrado</strong> em um raio de ${RAIO_KM}km.<br>
          <span style="font-size:0.9rem; color:#999;">Tente ampliar a busca ou use os filtros de categoria.</span>
        </div>`;
    }
  }
}

/**
 * Inicializa o botão de localização.
 * Ao clicar: pede permissão → mostra loading → filtra → atualiza botão.
 */
function inicializarGeolocalizacao() {
  const btn = document.getElementById("btnLocalizacao");
  const btnTexto = document.getElementById("btnLocalizacaoTexto");
  const btnLimpar = document.getElementById("btnLimparBusca");
  if (!btn) return;

  // Verifica se o navegador suporta geolocalização
  if (!navigator.geolocation) {
    btn.style.display = "none";
    return;
  }

  btn.addEventListener("click", () => {
    // Se já está ativo, desativa e volta aos destaques
    if (btn.classList.contains("ativo")) {
      btn.classList.remove("ativo");
      btn.querySelector("i").className = "fa-solid fa-location-crosshairs";
      btnTexto.textContent = "Lojistas perto de mim";
      localizacaoUsuario = null;

      // Remove badges de distância e restaura destaques
      document.querySelectorAll(".distancia-badge").forEach(b => b.remove());
      const apenasDestaques = lojistas.filter((l) => l.isDestaque);
      renderizarCards(apenasDestaques);
      const areaFiltros = document.getElementById("area-filtros");
      if (areaFiltros) areaFiltros.style.display = "none";
      return;
    }

    // Estado: buscando
    btn.classList.add("buscando");
    btn.querySelector("i").className = "fa-solid fa-spinner";
    btnTexto.textContent = "Obtendo localização...";

    navigator.geolocation.getCurrentPosition(
      // Sucesso
      (posicao) => {
        const { latitude, longitude } = posicao.coords;
        localizacaoUsuario = { latitude, longitude };

        // Atualiza botão para estado ativo
        btn.classList.remove("buscando");
        btn.classList.add("ativo");
        btn.querySelector("i").className = "fa-solid fa-location-dot";
        btnTexto.textContent = `Próximos (raio ${RAIO_KM}km)`;

        // Filtra os lojistas
        filtrarPorProximidade(latitude, longitude);

        // Garante que o botão "Mostrar todos" também limpa a geolocalização
        if (btnLimpar) {
          btnLimpar.onclick = () => {
            btn.classList.remove("ativo");
            btn.querySelector("i").className = "fa-solid fa-location-crosshairs";
            btnTexto.textContent = "Lojistas perto de mim";
            localizacaoUsuario = null;
            document.querySelectorAll(".distancia-badge").forEach(b => b.remove());
            const apenasDestaques = lojistas.filter((l) => l.isDestaque);
            renderizarCards(apenasDestaques);
            const areaFiltros = document.getElementById("area-filtros");
            if (areaFiltros) areaFiltros.style.display = "none";
          };
        }
      },
      // Erro
      (erro) => {
        btn.classList.remove("buscando");
        btn.querySelector("i").className = "fa-solid fa-location-crosshairs";
        btnTexto.textContent = "Lojistas perto de mim";

        const msgs = {
          1: "Permissão de localização negada. Habilite nas configurações do navegador.",
          2: "Não foi possível obter sua localização. Tente novamente.",
          3: "Tempo esgotado. Tente novamente.",
        };
        alert(msgs[erro.code] || "Erro ao obter localização.");
      },
      // Opções
      {
        enableHighAccuracy: true,  // Usa GPS quando disponível
        timeout: 10000,            // Máximo 10s de espera
        maximumAge: 60000,         // Aceita localização cacheada por até 1 minuto
      }
    );
  });
}

// Chama a inicialização dentro do DOMContentLoaded existente
document.addEventListener("DOMContentLoaded", () => {
  inicializarGeolocalizacao();
});

/* ==============================================
   MÓDULO DE ENCARTES — Carrossel Coverflow
   - Expansão automática a cada 4s
   - Pausa ao hover/touch
   - Navegação por clique nas colunas e bolinhas
   - Abre modal do lojista ao clicar em "Ver lojista"
   ============================================== */

function inicializarEncartes() {
  const container = document.getElementById("encartesCarrossel");
  const dotsContainer = document.getElementById("encartesDots");
  const dados = window.encartes || [];
  if (!container || dados.length === 0) return;

  let ativoIndex = 0;
  let intervalo = null;
  let pausado = false;

  // ── Renderiza as colunas ──
  dados.forEach((encarte, i) => {
    const col = document.createElement("div");
    col.className = "encarte-col" + (i === 0 ? " ativo" : "");
    col.setAttribute("role", "listitem");
    col.setAttribute("aria-label", encarte.titulo);
    col.dataset.index = i;

    col.innerHTML = `
      <img
        class="encarte-imagem"
        src="${otimizarImagem(encarte.imagemEncarte, 'banner')}"
        alt="${encarte.titulo}"
        loading="lazy"
        draggable="false"
      />
      <div class="encarte-overlay"></div>
      <div class="encarte-info">
        <div class="encarte-lojista-nome">
          <i class="fa-solid fa-store"></i>
          <span>${encarte.nomeLojista}</span>
        </div>
        <h3 class="encarte-titulo">${encarte.titulo}</h3>
        <p class="encarte-descricao">${encarte.descricao}</p>
        <button
          class="encarte-btn"
          data-lojista-id="${encarte.lojistaId}"
          aria-label="Ver detalhes de ${encarte.nomeLojista}"
        >
          <i class="fa-regular fa-eye"></i> Ver lojista
        </button>
      </div>
    `;

    // Clique na coluna comprimida → expande
    col.addEventListener("click", (e) => {
      // Se clicou no botão, abre o modal — não ativa o encarte
      if (e.target.closest(".encarte-btn")) return;
      if (!col.classList.contains("ativo")) {
        ativarEncarte(i);
        reiniciarIntervalo();
      }
    });

    // Botão "Ver lojista" → abre modal do lojista
    col.querySelector(".encarte-btn").addEventListener("click", () => {
      abrirModal(encarte.lojistaId);
    });

    container.appendChild(col);
  });

  // ── Renderiza as bolinhas ──
  dados.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "encarte-dot" + (i === 0 ? " ativo" : "");
    dot.setAttribute("aria-label", `Encarte ${i + 1}`);
    dot.addEventListener("click", () => {
      ativarEncarte(i);
      reiniciarIntervalo();
    });
    dotsContainer.appendChild(dot);
  });

  // ── Ativa um encarte pelo índice ──
  function ativarEncarte(index) {
    ativoIndex = index;

    // Atualiza colunas
    container.querySelectorAll(".encarte-col").forEach((col, i) => {
      col.classList.toggle("ativo", i === index);
    });

    // Atualiza bolinhas
    dotsContainer.querySelectorAll(".encarte-dot").forEach((dot, i) => {
      dot.classList.toggle("ativo", i === index);
    });
  }

  // ── Avança para o próximo encarte ──
  function avancar() {
    if (pausado) return;
    ativarEncarte((ativoIndex + 1) % dados.length);
  }

  // ── Inicia o intervalo automático (4s) ──
  function iniciarIntervalo() {
    intervalo = setInterval(avancar, 4000);
  }

  function reiniciarIntervalo() {
    clearInterval(intervalo);
    iniciarIntervalo();
  }

  // ── Pausa ao hover (desktop) ──
  container.addEventListener("mouseenter", () => { pausado = true; });
  container.addEventListener("mouseleave", () => { pausado = false; });

  // ── Pausa ao toque (mobile) — retoma após 3s sem tocar ──
  let touchTimer = null;
  container.addEventListener("touchstart", () => {
    pausado = true;
    clearTimeout(touchTimer);
  }, { passive: true });

  container.addEventListener("touchend", () => {
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => { pausado = false; }, 3000);
  }, { passive: true });

  // ── Swipe mobile: deslizar para navegar ──
  let touchStartX = 0;
  container.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  container.addEventListener("touchend", (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Deslizou para esquerda → avança
        ativarEncarte((ativoIndex + 1) % dados.length);
      } else {
        // Deslizou para direita → volta
        ativarEncarte((ativoIndex - 1 + dados.length) % dados.length);
      }
      reiniciarIntervalo();
    }
  }, { passive: true });

  // ── Inicia ──
  iniciarIntervalo();
}

// Chama no DOMContentLoaded já existente via patch abaixo
document.addEventListener("DOMContentLoaded", () => {
  inicializarEncartes();
});

/* ==============================================
   TRANSIÇÕES DE NAVEGAÇÃO
   ============================================== */

(function () {

  /* ── 1. SCROLL SUAVE COM EASING PERSONALIZADO ──
     Intercepta todos os links de âncora (#section)
     e aplica scroll com curva easeInOutQuart —
     muito mais suave que o scroll nativo do browser. */

  function easeInOutQuart(t) {
    return t < 0.5
      ? 8 * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function scrollSuave(alvo, duracao) {
    const navbar = document.querySelector(".navbar");
    const alturaNavbar = navbar ? navbar.offsetHeight : 70;
    const inicio = window.scrollY;
    const destino = alvo - alturaNavbar - 16;
    const distancia = destino - inicio;
    let startTime = null;

    function animar(timestamp) {
      if (!startTime) startTime = timestamp;
      const progresso = Math.min((timestamp - startTime) / duracao, 1);
      const ease = easeInOutQuart(progresso);
      window.scrollTo(0, inicio + distancia * ease);
      if (progresso < 1) requestAnimationFrame(animar);
    }

    requestAnimationFrame(animar);
  }

  /* ── 2. HIGHLIGHT NA SEÇÃO DE DESTINO ──
     Ao chegar, pisca uma borda rosé suave na seção
     para orientar o usuário visualmente. */

  function destacarSecao(el) {
    el.classList.remove("section-highlight");
    void el.offsetWidth; // força reflow para reiniciar animação
    el.classList.add("section-highlight");
    setTimeout(() => el.classList.remove("section-highlight"), 1300);
  }

  /* ── 3. INTERCEPTA CLIQUES NOS LINKS DE ÂNCORA ── */

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;

    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;

    const alvo = document.querySelector(hash);
    if (!alvo) return;

    e.preventDefault();

    const topoAlvo = alvo.getBoundingClientRect().top + window.scrollY;
    scrollSuave(topoAlvo, 900); // 900ms — suave mas não lento demais

    // Destaca a seção após o scroll chegar
    setTimeout(() => destacarSecao(alvo), 920);
  });

  /* ── 4. NAVBAR COMPACTA AO ROLAR ──
     Reduz o padding da navbar quando o usuário
     rola para baixo, ganhando mais espaço visual. */

  const navbar = document.querySelector(".navbar");
  if (navbar) {
    let ultimoScroll = 0;
    let timerNavbar = null;

    window.addEventListener("scroll", () => {
      if (timerNavbar) return; // throttle
      timerNavbar = setTimeout(() => {
        timerNavbar = null;
        const scrollAtual = window.scrollY;

        if (scrollAtual > 80) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }

        ultimoScroll = scrollAtual;
      }, 80);
    }, { passive: true });
  }

})();