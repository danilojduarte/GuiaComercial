/* ==============================================
   GUIA COMERCIAL — destaques.js  v2
   Novidades:
     ✔ Carrossel: setas + dots + scroll sincronizado
     ✔ Badge Aberto (verde) / Fechado (vermelho)
     ✔ Animação de entrada com IntersectionObserver

   Estrutura:
   1. Seleção de elementos
   2. Badge de status (Aberto / Fechado)
   3. Carrossel — estado e helpers
   4. Carrossel — gerar dots dinamicamente
   5. Carrossel — atualizar dots e setas
   6. Carrossel — navegar com as setas
   7. Carrossel — sincronizar com o scroll nativo
   8. Animação de entrada (IntersectionObserver)
   9. Inicialização
   ============================================== */


/* -----------------------------------------------
   1. SELEÇÃO DE ELEMENTOS DO DOM
   ----------------------------------------------- */
const wrapper    = document.getElementById('carrosselWrapper');
const trilho     = document.getElementById('destaquesTrilho');
const dotsBox    = document.getElementById('carrosselDots');
const btnPrev    = document.getElementById('setaPrev');
const btnNext    = document.getElementById('setaNext');
const cards      = Array.from(document.querySelectorAll('.destaque-card'));
const totalCards = cards.length;


/* -----------------------------------------------
   2. BADGE DE STATUS — ABERTO / FECHADO
   Lê data-abre, data-fecha e data-fecha-semana
   de cada card e define o badge com cor correta.
   ----------------------------------------------- */

/**
 * Verifica se um estabelecimento está aberto agora.
 *
 * @param {HTMLElement} card - O elemento .destaque-card
 * @returns {boolean} true = aberto, false = fechado
 *
 * Atributos HTML usados:
 *   data-abre         → "HH:MM" — horário de abertura
 *   data-fecha        → "HH:MM" — horário de fechamento
 *   data-fecha-semana → 0–6 (Dom–Sáb) — dia de folga semanal
 *                       omita se o estabelecimento não fechar dia fixo
 */
function estaAberto(card) {
    const abre      = card.dataset.abre  || '08:00';
    const fecha     = card.dataset.fecha || '18:00';
    const diaFolga  = card.dataset.fechaSemana; // undefined se não informado

    const agora     = new Date();
    const diaHoje   = agora.getDay();                           // 0=Dom … 6=Sáb
    const minAgora  = agora.getHours() * 60 + agora.getMinutes(); // minutos desde meia-noite

    // Converte "HH:MM" em minutos desde meia-noite
    // Ex: "18:30" → 18*60+30 = 1110
    function toMin(hhmm) {
        const partes = hhmm.split(':').map(Number);
        return partes[0] * 60 + (partes[1] || 0);
    }

    const minAbre  = toMin(abre);
    const minFecha = toMin(fecha);

    // Dia de folga: se hoje é o dia de folga → fechado
    if (diaFolga !== undefined && String(diaHoje) === String(diaFolga)) {
        return false;
    }

    // Funcionamento 24h: abre=00:00 e fecha=23:59 ou 23:30+
    if (minAbre === 0 && minFecha >= 1430) {
        return true;
    }

    // Horário normal: verifica se agora está entre abertura e fechamento
    return minAgora >= minAbre && minAgora < minFecha;
}

/**
 * Atualiza o badge de status de TODOS os cards.
 * Chamada na inicialização e a cada 60 segundos.
 */
function atualizarBadgesStatus() {
    cards.forEach(function (card) {
        const badge = card.querySelector('.card-status');
        if (!badge) return;

        const aberto = estaAberto(card);

        if (aberto) {
            // Badge verde com bolinha pulsante "●"
            badge.textContent = '● Aberto';
            badge.className   = 'card-status status-aberto';
            badge.setAttribute('title', 'Estabelecimento aberto agora');
        } else {
            // Badge vermelho com "×"
            badge.textContent = '× Fechado';
            badge.className   = 'card-status status-fechado';
            badge.setAttribute('title', 'Estabelecimento fechado no momento');
        }
    });
}


/* -----------------------------------------------
   3. CARROSSEL — ESTADO E HELPERS

   O carrossel usa o SCROLL NATIVO do browser
   (CSS scroll-snap). O JS só:
     a) gera e atualiza os dots
     b) atualiza o estado das setas (prev/next)
     c) executa o scroll ao clicar nas setas

   O swipe/touch é 100% nativo — zero JS.
   ----------------------------------------------- */

/* Índice do card atualmente visível */
let indiceAtual = 0;

/**
 * Verifica se o carrossel está ativo (mobile).
 * No desktop, o wrapper não tem overflow:scroll,
 * então as setas e dots não devem funcionar.
 */
function carrosselAtivo() {
    return window.getComputedStyle(wrapper).overflowX === 'scroll';
}

/**
 * Calcula qual card está mais visível no momento,
 * baseado na posição de scroll do wrapper.
 * Retorna o índice (0 a totalCards-1).
 */
function calcularIndiceVisivel() {
    if (!carrosselAtivo()) return 0;

    const scrollX      = wrapper.scrollLeft;
    const larguraCard  = cards[0] ? cards[0].offsetWidth : 0;
    const gap          = 14; // gap em px (igual ao CSS)

    // Calcula qual card está mais próximo do início do scroll
    const indice = Math.round(scrollX / (larguraCard + gap));

    // Garante que não ultrapasse os limites
    return Math.max(0, Math.min(indice, totalCards - 1));
}


/* -----------------------------------------------
   4. CARROSSEL — GERAR DOTS DINAMICAMENTE
   Cria um <button> dot para cada card.
   Os dots são gerados uma única vez na inicialização.
   ----------------------------------------------- */
function gerarDots() {
    dotsBox.innerHTML = ''; // Limpa qualquer dot existente

    cards.forEach(function (_, i) {
        const dot = document.createElement('button');
        dot.className   = 'dot' + (i === 0 ? ' ativo' : '');
        dot.setAttribute('aria-label', 'Ir para o card ' + (i + 1));
        dot.setAttribute('type', 'button');

        // Ao clicar no dot, navega para o card correspondente
        dot.addEventListener('click', function () {
            navegarPara(i);
        });

        dotsBox.appendChild(dot);
    });
}


/* -----------------------------------------------
   5. CARROSSEL — ATUALIZAR DOTS E SETAS
   Chamada sempre que o índice visível muda.
   ----------------------------------------------- */
function atualizarControles(indice) {
    /* ── Dots ── */
    const todos = dotsBox.querySelectorAll('.dot');
    todos.forEach(function (dot, i) {
        dot.classList.toggle('ativo', i === indice);
        // Atualiza o aria-current para acessibilidade
        dot.setAttribute('aria-current', i === indice ? 'true' : 'false');
    });

    /* ── Setas ── */
    // Seta "anterior": desabilitada no primeiro card
    const noInicio = indice === 0;
    btnPrev.setAttribute('aria-disabled', noInicio ? 'true' : 'false');

    // Seta "próximo": desabilitada no último card
    const noFim = indice === totalCards - 1;
    btnNext.setAttribute('aria-disabled', noFim ? 'true' : 'false');

    // Atualiza o índice atual
    indiceAtual = indice;
}


/* -----------------------------------------------
   6. CARROSSEL — NAVEGAR COM AS SETAS
   Calcula a posição de scroll para o card-alvo
   e usa scrollTo para animar suavemente.
   ----------------------------------------------- */

/**
 * Navega o carrossel para o card de índice `alvo`.
 * @param {number} alvo - Índice do card destino (0 a totalCards-1)
 */
function navegarPara(alvo) {
    if (!carrosselAtivo()) return;

    // Garante que o alvo está dentro dos limites
    alvo = Math.max(0, Math.min(alvo, totalCards - 1));

    const larguraCard = cards[0] ? cards[0].offsetWidth : 0;
    const gap         = 14; // deve bater com o gap do CSS

    // Posição de scroll = (largura do card + gap) × índice alvo
    const scrollAlvo = alvo * (larguraCard + gap);

    // scroll-behavior: smooth está no CSS do wrapper,
    // mas chamamos com behavior aqui como reforço
    wrapper.scrollTo({ left: scrollAlvo, behavior: 'smooth' });

    // Atualiza controles imediatamente (não espera o scroll terminar)
    atualizarControles(alvo);
}

/* Eventos das setas */
btnPrev.addEventListener('click', function () {
    navegarPara(indiceAtual - 1);
});

btnNext.addEventListener('click', function () {
    navegarPara(indiceAtual + 1);
});

/* Navegação por teclado nas setas (← →) */
[btnPrev, btnNext].forEach(function (btn) {
    btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft')  navegarPara(indiceAtual - 1);
        if (e.key === 'ArrowRight') navegarPara(indiceAtual + 1);
    });
});


/* -----------------------------------------------
   7. CARROSSEL — SINCRONIZAR COM O SCROLL NATIVO
   Quando o usuário faz swipe (toque), o scroll
   acontece nativamente. Aqui atualizamos dots
   e setas para refletir a nova posição.

   Usamos debounce para não chamar calcularIndiceVisivel
   dezenas de vezes por segundo durante o scroll.
   ----------------------------------------------- */
let timerScroll = null;

wrapper.addEventListener('scroll', function () {
    // Cancela o timer anterior (debounce de 80ms)
    clearTimeout(timerScroll);

    timerScroll = setTimeout(function () {
        const novoIndice = calcularIndiceVisivel();

        // Só atualiza se o índice realmente mudou
        if (novoIndice !== indiceAtual) {
            atualizarControles(novoIndice);
        }
    }, 80); // 80ms após parar o scroll
});


/* -----------------------------------------------
   8. ANIMAÇÃO DE ENTRADA (IntersectionObserver)
   No desktop, os cards entram com opacidade e
   translateY. No mobile (carrossel), todos já
   estão visíveis — o CSS sobrescreve isso.
   ----------------------------------------------- */
function iniciarAnimacaoEntrada() {
    // Navegadores muito antigos: mostra tudo diretamente
    if (!('IntersectionObserver' in window)) {
        cards.forEach(function (c) { c.classList.add('visivel'); });
        return;
    }

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visivel');
                observer.unobserve(entry.target); // Para de observar após animar
            }
        });
    }, {
        threshold:  0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    cards.forEach(function (card) { observer.observe(card); });
}


/* -----------------------------------------------
   9. INICIALIZAÇÃO
   Tudo começa aqui, após o DOM estar pronto.
   ----------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {

    /* ── Status Aberto / Fechado ── */
    atualizarBadgesStatus();
    // Reavalia a cada 60 segundos (útil para horários de abertura/fechamento)
    setInterval(atualizarBadgesStatus, 60 * 1000);

    /* ── Carrossel: gera dots e ajusta controles iniciais ── */
    gerarDots();
    atualizarControles(0); // Começa no primeiro card com prev desabilitado

    /* ── Animação de entrada ── */
    iniciarAnimacaoEntrada();

    /* ── Reajuste ao redimensionar a janela ──
       Se o usuário girar o celular ou redimensionar
       o browser, o carrossel pode ficar fora de posição.
       Voltamos ao início suavemente. */
    let timerResize = null;
    window.addEventListener('resize', function () {
        clearTimeout(timerResize);
        timerResize = setTimeout(function () {
            if (carrosselAtivo()) {
                navegarPara(0); // Volta ao primeiro card ao redimensionar
            }
        }, 200);
    });

    /* ── Log de desenvolvimento ──
       Remova (ou comente) quando for para produção */
    console.log('[Destaques v2] Carrossel iniciado com', totalCards, 'cards.');
});
