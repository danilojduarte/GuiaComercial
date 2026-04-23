/* ==============================================
   GUIA COMERCIAL — script.js
   Estrutura:
   1. Seleção de Elementos
   2. Menu Mobile (Hamburguer)
   3. Fechar menu ao clicar fora
   4. Barra de Busca
   5. Quick Cards
   6. Fechar dropdown com Escape
   ============================================== */


/* -----------------------------------------------
   1. SELEÇÃO DE ELEMENTOS DO DOM
   Guardamos as referências dos elementos em
   variáveis para não precisar buscá-los toda vez.
   "const" porque esses valores não mudam.
   ----------------------------------------------- */
const btnHamburger = document.getElementById('btnHamburger');
const menuMobile   = document.getElementById('menuMobile');
const campoBusca   = document.getElementById('campoBusca');
const btnBuscar    = document.getElementById('btnBuscar');
const quickCards   = document.querySelectorAll('.q-card'); // Retorna todos os cards
const btnDropdown  = document.getElementById('btnCategorias');


/* -----------------------------------------------
   2. MENU MOBILE — abre e fecha ao clicar no hamburguer
   ----------------------------------------------- */
btnHamburger.addEventListener('click', function () {

    // toggle() adiciona a classe se não existir, remove se já existir
    const estaAberto = menuMobile.classList.toggle('aberto');
    btnHamburger.classList.toggle('ativo');

    // Atualiza os atributos de acessibilidade (para leitores de tela)
    btnHamburger.setAttribute('aria-expanded', estaAberto);
    menuMobile.setAttribute('aria-hidden', !estaAberto);
});

/* Fecha o menu mobile ao clicar em qualquer link dentro dele */
menuMobile.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
        menuMobile.classList.remove('aberto');
        btnHamburger.classList.remove('ativo');
        btnHamburger.setAttribute('aria-expanded', 'false');
        menuMobile.setAttribute('aria-hidden', 'true');
    });
});


/* -----------------------------------------------
   3. FECHAR MENU AO CLICAR FORA DELE
   Se o usuário clicar em qualquer lugar da página
   que não seja o menu ou o botão hamburguer,
   o menu fecha automaticamente.
   ----------------------------------------------- */
document.addEventListener('click', function (evento) {

    // contains() verifica se o clique foi DENTRO dos elementos
    const clicouNoMenu    = menuMobile.contains(evento.target);
    const clicouNoBotao   = btnHamburger.contains(evento.target);

    // Se o menu está aberto E o clique foi fora dele → fecha
    if (menuMobile.classList.contains('aberto') && !clicouNoMenu && !clicouNoBotao) {
        menuMobile.classList.remove('aberto');
        btnHamburger.classList.remove('ativo');
        btnHamburger.setAttribute('aria-expanded', 'false');
        menuMobile.setAttribute('aria-hidden', 'true');
    }
});


/* -----------------------------------------------
   4. BARRA DE BUSCA
   Executa a busca tanto no clique do botão
   quanto ao pressionar Enter no campo de texto.
   ----------------------------------------------- */

/**
 * Função principal de busca.
 * Lê o valor do campo, valida se não está vazio
 * e então executa a ação desejada.
 */
function executarBusca() {
    // trim() remove espaços em branco no início e no fim
    const termoBuscado = campoBusca.value.trim();

    // Validação: não faz nada se o campo estiver vazio
    if (termoBuscado === '') {
        // Coloca o foco de volta no campo e dá um "chacoalhão" visual
        campoBusca.focus();
        campoBusca.classList.add('campo-erro');

        // Remove a classe de erro depois de 600ms
        setTimeout(function () {
            campoBusca.classList.remove('campo-erro');
        }, 600);

        return; // Sai da função sem continuar
    }

    // ✅ Aqui você conectará com o back-end ou seu sistema de busca.
    // Por enquanto, exibe no console para testes.
    console.log('Buscando por:', termoBuscado);

    // Exemplo de uso futuro:
    // window.location.href = `resultados.html?q=${encodeURIComponent(termoBuscado)}`;
}

/* Dispara a busca ao clicar no botão "BUSCAR" */
btnBuscar.addEventListener('click', executarBusca);

/* Dispara a busca ao pressionar Enter no campo de texto */
campoBusca.addEventListener('keydown', function (evento) {
    if (evento.key === 'Enter') {
        executarBusca();
    }
});


/* -----------------------------------------------
   5. QUICK CARDS — clique e teclado nas categorias
   ----------------------------------------------- */
quickCards.forEach(function (card) {

    /* Clique com o mouse */
    card.addEventListener('click', function () {
        // data-categoria é o atributo que colocamos no HTML
        const categoria = card.dataset.categoria;

        // ✅ Conecte aqui ao seu sistema de filtro.
        console.log('Categoria selecionada:', categoria);

        // Exemplo de uso futuro:
        // window.location.href = `resultados.html?categoria=${encodeURIComponent(categoria)}`;
    });

    /* Acessibilidade: permite "clicar" com Enter ou Espaço no teclado.
       Sem isso, elementos com tabindex funcionam só com mouse. */
    card.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault(); // Evita que a página role ao pressionar Espaço
            card.click();            // Dispara o evento de clique acima
        }
    });
});


/* -----------------------------------------------
   6. FECHAR DROPDOWN COM A TECLA ESCAPE
   Melhora a experiência de usuários de teclado.
   ----------------------------------------------- */
document.addEventListener('keydown', function (evento) {

    if (evento.key === 'Escape') {

        /* Fecha o menu mobile se estiver aberto */
        if (menuMobile.classList.contains('aberto')) {
            menuMobile.classList.remove('aberto');
            btnHamburger.classList.remove('ativo');
            btnHamburger.setAttribute('aria-expanded', 'false');
            menuMobile.setAttribute('aria-hidden', 'true');
            btnHamburger.focus(); // Devolve o foco ao botão hamburguer
        }

        /* Perde o foco do botão de dropdown (fecha o dropdown CSS) */
        if (document.activeElement === btnDropdown) {
            btnDropdown.blur();
        }
    }
});


//Função para atualizar status do lojista de aberto/fechado, utilizado a hora atual.
function atualizarStatusLojas() {
    // 1. Pega a data e hora atual do navegador
    const agora = new Date();
    const hora = agora.getHours();
    const minutos = agora.getMinutes();
    
    // Converte para um número comparável (ex: 15:43 vira 1543)
    const horaAtualFormatada = (hora * 100) + minutos;

    // 2. Busca todos os cards de lojistas
    const cards = document.querySelectorAll('.card-lojista');

    cards.forEach(card => {
        const badge = card.querySelector('.status-badge');
        
        // Pega os horários definidos no HTML do card
        const abreStr = card.getAttribute('data-abre').replace(':', '');
        const fechaStr = card.getAttribute('data-fecha').replace(':', '');
        
        const horaAbre = parseInt(abreStr);
        const horaFecha = parseInt(fechaStr);

        // 3. Lógica de comparação
        if (horaAtualFormatada >= horaAbre && horaAtualFormatada < horaFecha) {
            badge.textContent = "Aberto Agora";
            badge.className = "status-badge aberto"; // Aplica a cor verde
        } else {
            badge.textContent = "Fechado";
            badge.className = "status-badge fechado"; // Aplica a cor vermelha
        }
    });
}

// Executa assim que a página termina de carregar
window.addEventListener('load', atualizarStatusLojas);