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
        // Busca o arquivo JSON na sua pasta
        const resposta = await fetch('js/lojistas.json');
        
        if (!resposta.ok) throw new Error('Não foi possível carregar os dados');

        lojistas = await resposta.json();
        
        // Após carregar, desenha os cards na tela
        renderizarCards(lojistas);
        
    } catch (erro) {
        console.error("Erro no carregamento:", erro);
        if (containerGrid) {
            containerGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color: #e74c3c;">Ops! Tivemos um problema ao carregar os comércios. Tente atualizar a página.</p>`;
        }
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
        renderizarCards(lojistas);
        gerenciarBotaoVoltar(false);
        return;
    }

    const resultados = lojistas.filter(item => 
        item.nome.toLowerCase().includes(termo) || 
        item.descricao.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo)
    );

    renderizarCards(resultados);
    gerenciarBotaoVoltar(true);
    
    containerGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Botão de limpar busca / voltar destaques
if (btnLimparBusca) {
    btnLimparBusca.addEventListener('click', () => {
        campoBusca.value = ""; 
        renderizarCards(lojistas); 
        gerenciarBotaoVoltar(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

btnBuscar.addEventListener('click', executarBusca);
campoBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') executarBusca(); });

// Quick Cards Filtros
quickCards.forEach(card => {
    card.addEventListener('click', () => {
        const categoriaSelecionada = card.dataset.categoria;
        
        if(categoriaSelecionada === "Todos") {
            renderizarCards(lojistas);
            gerenciarBotaoVoltar(false);
        } else {
            const filtrados = lojistas.filter(l => l.categoria === categoriaSelecionada);
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