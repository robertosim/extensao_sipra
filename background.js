// Variável de controle para evitar que o loop de processamento rode mais de uma vez simultaneamente.
let loopAtivo = false;

// Listener para escutar mensagens enviadas pelo popup.js (interface de usuário)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Ação: Inicia o processo de extração a partir da lista enviada pelo popup
  if (request.acao === "iniciar") {
    // Salva os dados na memória local (Storage API) do Chrome
    chrome.storage.local.set({
      fila: request.lista,          // A lista de objetos {codigo, nome} a processar
      total: request.lista.length,  // O total de itens na fila
      processados: 0,               // Contador de itens já concluídos
      estado: "processando",        // Status atual da máquina de estados
      itemAtual: null               // Item sendo processado no momento
    }, () => {
      iniciarLoopProcessamento();   // Chama a função principal que inicia os downloads
      sendResponse({ sucesso: true });
    });
    return true; // Mantém o canal de mensagem aberto para chamadas assíncronas
  }

  // Ação: Pausa temporariamente o processamento
  if (request.acao === "pausar") {
    chrome.storage.local.set({ estado: "pausado" });
    sendResponse({ sucesso: true });
  }

  // Ação: Retoma o processamento de onde parou
  if (request.acao === "continuar") {
    chrome.storage.local.set({ estado: "processando" }, () => {
      iniciarLoopProcessamento();
      sendResponse({ sucesso: true });
    });
    return true;
  }

  // Ação: Cancela tudo e limpa a fila
  if (request.acao === "cancelar") {
    chrome.storage.local.set({ fila: [], total: 0, processados: 0, estado: "parado", itemAtual: null });
    sendResponse({ sucesso: true });
  }
});

// Inicia o motor de processamento, garantindo que não haja sobreposição de instâncias
async function iniciarLoopProcessamento() {
  if (loopAtivo) return; // Se já estiver rodando, bloqueia nova execução
  loopAtivo = true;
  await processarProximo(); // Processa o próximo item da fila
  loopAtivo = false;
}

// Função principal e recursiva que manipula aba, debugger e download do PDF
async function processarProximo() {
  // Resgata o estado atual gravado no storage
  const dados = await chrome.storage.local.get(['fila', 'total', 'processados', 'estado']);
  
  // Condições de parada: se não estiver processando ou a fila estiver vazia
  if (dados.estado !== 'processando') return;
  if (!dados.fila || dados.fila.length === 0) {
    await chrome.storage.local.set({ estado: "parado", itemAtual: null });
    return;
  }

  // Remove o primeiro elemento da fila (FIFO - First in, First out) para processar
  const itemAtual = dados.fila.shift();
  const codigoBeneficiario = itemAtual.codigo;
  
  // HIGIENIZAÇÃO: Limpa o nome removendo caracteres não permitidos por Windows/Mac/Linux no nome do arquivo
  const nomeBeneficiario = itemAtual.nome.replace(/[/\\?%*:|"<>]/g, '-').trim();
  
  // Atualiza contadores
  const processadosAgora = (dados.processados || 0) + 1;

  // Atualiza o storage com a nova fila (sem o item atual) e o item em andamento para o popup ler
  await chrome.storage.local.set({ 
    fila: dados.fila, 
    processados: processadosAgora,
    itemAtual: itemAtual 
  });

  // Monta a URL de destino baseada no código do beneficiário
  const urlCompleta = `http://sipra.incra.gov.br/beneficiario/Relatorios/benef_espelho.asp?c_beneficiario_identificacao_codigo=${codigoBeneficiario}`;
  let tabIdParaFechar = null;

  try {
    // 1. Cria uma aba oculta (active: false) para não interromper a navegação do usuário
    const tab = await chrome.tabs.create({ url: urlCompleta, active: false });
    tabIdParaFechar = tab.id;

    // 2. Aguarda o DOM da página carregar completamente
    await aguardarCargaDaAba(tab.id);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Delay extra para eventuais scripts da página do INCRA

    // 3. Anexa o "Debugger" (DevTools) à aba. Isso permite comandos de baixo nível.
    const target = { tabId: tab.id };
    await chrome.debugger.attach(target, "1.3");

    // 4. Executa o comando secreto de salvar em PDF silenciosamente
    const { data } = await chrome.debugger.sendCommand(target, "Page.printToPDF", {
      landscape: false,       // Orientação Retrato
      paperWidth: 8.27,       // Largura A4 em polegadas
      paperHeight: 11.69,     // Altura A4 em polegadas
      marginTop: 0.4,         // Margens
      marginBottom: 0.4,
      marginLeft: 0.4,
      marginRight: 0.4,
      printBackground: true   // Imprime as cores de fundo da página do SIPRA
    });

    // 5. Desanexa o debugger e fecha a aba (liberando memória)
    await chrome.debugger.detach(target);
    await chrome.tabs.remove(tab.id);
    tabIdParaFechar = null;

    // 6. Converte o resultado (Base64) em formato interpretável para download
    const base64Url = "data:application/pdf;base64," + data;
    
    // 7. Salva o PDF no computador usando a API de downloads
    await chrome.downloads.download({
      url: base64Url,
      filename: `${codigoBeneficiario} - ${nomeBeneficiario}.pdf`, // Padrão: "Código - Nome"
      conflictAction: "overwrite" // Sobrescreve caso já exista arquivo com mesmo nome
    });

    // Tempo de respiro para não sobrecarregar o sistema do usuário (e do INCRA)
    await new Promise(resolve => setTimeout(resolve, 1500)); 

  } catch (erro) {
    // Loga erro no console da extensão e tenta fechar a aba presa se houver falha
    console.error(`Erro no código ${codigoBeneficiario}:`, erro);
    if (tabIdParaFechar) {
      try { await chrome.tabs.remove(tabIdParaFechar); } catch (e) {}
    }
  }

  // Chamada recursiva para processar o próximo item da fila
  await processarProximo();
}

// Função auxiliar para resolver uma Promise apenas quando a aba disparar status 'complete'
function aguardarCargaDaAba(tabId) {
  return new Promise((resolve) => {
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener); // Remove o "escutador" após carregar
        resolve(); // Dá o aval para continuar a execução do código
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}