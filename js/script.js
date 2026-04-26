/* ==============================================
   GUIA COMERCIAL — script.js
   ============================================== */

/* ==============================================
   GUIA COMERCIAL — script.js
   ============================================== */

let lojistas = []; // Começa vazio, será preenchido pelo arquivo JSON

// FUNÇÃO PARA BUSCAR OS DADOS EXTERNOS
async function carregarDadosLojistas() {
    try {
        const resposta = await fetch('/js/lojistas.json');
        if (!resposta.ok) throw new Error('Erro ao carregar JSON');
        
        lojistas = await resposta.json();
        
        // 1. Filtramos apenas quem é destaque
        const apenasDestaques = lojistas.filter(l => l.isDestaque === true);
        
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
const btnHamburger = document.getElementById('btnHamburger');
const menuMobile   = document.getElementById('menuMobile');
const campoBusca   = document.getElementById('campoBusca');
const btnBuscar    = document.getElementById('btnBuscar');
const quickCards   = document.querySelectorAll('.q-card');
const btnDropdown  = document.getElementById('btnCategorias');
const containerGrid = document.querySelector('.cards-grid');

// Novos elementos do filtro/busca
const areaFiltros    = document.getElementById('area-filtros');
const btnLimparBusca = document.getElementById('btnLimparBusca');

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

    lista.forEach(lojista => {
        const cardHTML = `
            <article class="card-lojista" data-abre="${lojista.abre}" data-fecha="${lojista.fecha}">
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
                        <a href="${lojista.linkInsta}" class="btn-social insta" title="Instagram"><i class="fa-brands fa-instagram"></i></a>
                        <a href="${lojista.linkWhats}" class="btn-social whats" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                        <a href="${lojista.linkMaps}" class="btn-social maps" title="Localização"><i class="fa-solid fa-map-location-dot"></i></a>
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
    const horaAtual = (agora.getHours() * 100) + agora.getMinutes();
    const cards = document.querySelectorAll('.card-lojista');

    cards.forEach(card => {
        const badge = card.querySelector('.status-badge');
        if (!badge) return;

        const horaAbre = parseInt(card.getAttribute('data-abre').replace(':', ''));
        const horaFecha = parseInt(card.getAttribute('data-fecha').replace(':', ''));

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
        areaFiltros.style.display = exibir ? 'block' : 'none';
    }
}

function executarBusca() {
    const termo = campoBusca.value.toLowerCase().trim();

    if (termo === '') {
        campoBusca.focus();
        campoBusca.classList.add('campo-erro');
        setTimeout(() => campoBusca.classList.remove('campo-erro'), 600);
        
        // Se a busca estiver vazia, volta a mostrar o padrão inicial
        const apenasDestaques = lojistas.filter(l => l.isDestaque === true);
        renderizarCards(apenasDestaques);
        gerenciarBotaoVoltar(false);
        return;
    }

    // FILTRO INTELIGENTE: Busca no Nome, Descrição, Categoria e Keywords
    const resultados = lojistas.filter(item => 
        item.nome.toLowerCase().includes(termo) || 
        item.descricao.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo) ||
        (item.keywords && item.keywords.toLowerCase().includes(termo)) // Procura nas palavras-chave
    );

    renderizarCards(resultados);
    gerenciarBotaoVoltar(true);
    
    containerGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Botão de limpar busca / voltar para destaques
if (btnLimparBusca) {
    btnLimparBusca.addEventListener('click', () => {
        campoBusca.value = ""; 
        
        // Quando limpa, volta a mostrar apenas os destaques sorteados
        const apenasDestaques = lojistas.filter(l => l.isDestaque === true);
        const destaquesSorteados = apenasDestaques.sort(() => Math.random() - 0.5);
        renderizarCards(destaquesSorteados.slice(0, 4)); 

        gerenciarBotaoVoltar(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

btnBuscar.addEventListener('click', executarBusca);
campoBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') executarBusca(); });

// Quick Cards Filtros (Categorias)
quickCards.forEach(card => {
    card.addEventListener('click', () => {
        const categoriaSelecionada = card.dataset.categoria.trim();

        console.log("Botão clicado:", categoriaSelecionada);
        
        if (categoriaSelecionada === "Todos") {
            // Volta para a vitrine inicial (destaques sorteados)
            const apenasDestaques = lojistas.filter(l => l.isDestaque === true);
            renderizarCards(apenasDestaques.sort(() => Math.random() - 0.5).slice(0, 4));
            gerenciarBotaoVoltar(false);
        } else {
            // FILTRO FLEXÍVEL: 
            // Procura se a categoria do JSON contém o texto do botão
            const filtrados = lojistas.filter(l => 
                l.categoria.toLowerCase().includes(categoriaSelecionada.toLowerCase())
            );

            renderizarCards(filtrados);
            gerenciarBotaoVoltar(true);
        }
        
        containerGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

/* -----------------------------------------------
   5. INTERFACE (MENU MOBILE, ESCAPE, EVENTOS)
   ----------------------------------------------- */

// Inicialização ao carregar página
window.addEventListener('load', () => {
    carregarDadosLojistas(); // Agora chamamos a função que busca o arquivo
});

// Menu Mobile toggle
if (btnHamburger && menuMobile) {
    btnHamburger.addEventListener('click', () => {
        const aberto = menuMobile.classList.toggle('aberto');
        btnHamburger.classList.toggle('ativo');
        btnHamburger.setAttribute('aria-expanded', aberto);
        menuMobile.setAttribute('aria-hidden', !aberto);
    });
}

// Fecha menu ao clicar fora
document.addEventListener('click', (e) => {
    if (menuMobile && menuMobile.classList.contains('aberto') && !menuMobile.contains(e.target) && !btnHamburger.contains(e.target)) {
        menuMobile.classList.remove('aberto');
        btnHamburger.classList.remove('ativo');
    }
});

// Tecla Escape para fechar menus
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (menuMobile) menuMobile.classList.remove('aberto');
        if (btnHamburger) btnHamburger.classList.remove('ativo');
        if (document.activeElement === btnDropdown) btnDropdown.blur();
    }
});