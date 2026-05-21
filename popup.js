// Assim que o HTML carregar, atualiza a interface com base no estado atual salvo e inicia um loop
document.addEventListener('DOMContentLoaded', () => {
  verificarEstado();
  setInterval(verificarEstado, 1000); // Atualiza a UI visualmente a cada 1 segundo (Progresso, texto)
});

// Evento de clique no botão de Iniciar a Extração
document.getElementById('btnIniciar').addEventListener('click', () => {
  const fileInput = document.getElementById('csvFile');
  
  // Validação: Usuário enviou arquivo?
  if (fileInput.files.length === 0) {
    alert('Por favor, selecione o arquivo CSV.');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader(); // API Nativa para ler arquivos do computador no navegador

  // O que acontece quando o arquivo terminar de ser lido:
  reader.onload = function(e) {
    const texto = e.target.result;
    const linhas = texto.split(/\r?\n/); // Divide o arquivo por quebras de linha (Windows/Mac)
    const lista = [];

    // Começa do índice 1 para pular a linha de cabeçalho do CSV
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha.length === 0) continue; // Pula linhas em branco

      const colunas = linha.split(','); // Divide as colunas pela vírgula
      
      // Valida se há colunas suficientes (esperado Código na col[0] e Nome na col[2])
      if (colunas.length >= 3) {
        lista.push({
          codigo: colunas[0].trim(),
          nome: colunas[2].trim() // Se o layout do CSV mudar, é aqui que ajustamos
        });
      }
    }

    if (lista.length === 0) {
      alert('Nenhum dado válido encontrado no arquivo.');
      return;
    }

    // Envia a lista tratada para o background.js inciar o motor de downloads
    chrome.runtime.sendMessage({ acao: "iniciar", lista: lista }, () => {
      document.getElementById('csvFile').value = ""; // Reseta o input do arquivo visualmente
      verificarEstado(); // Atualiza a tela de upload para a tela de progresso
    });
  };

  // Lê o arquivo com a codificação padrão do Windows/Brasil 
  // para reconhecer acentos como 'Ç', 'Ã', 'É' corretamente.
  reader.readAsText(file, 'ISO-8859-1');
});

// Evento do botão Pausar / Continuar (o mesmo botão troca de papel)
document.getElementById('btnPausarContinuar').addEventListener('click', () => {
  const btn = document.getElementById('btnPausarContinuar');
  const acao = btn.innerText === "Pausar" ? "pausar" : "continuar";
  // Envia comando e, após a resposta, atualiza as cores e o status visual na tela
  chrome.runtime.sendMessage({ acao: acao }, () => verificarEstado());
});

// Evento do botão Cancelar (vermelho)
document.getElementById('btnCancelar').addEventListener('click', () => {
  // Pede confirmação de segurança para não apagar a fila por acidente
  if(confirm("Tem certeza que deseja cancelar e zerar a fila?")) {
    document.getElementById('csvFile').value = "";
    chrome.runtime.sendMessage({ acao: "cancelar" }, () => verificarEstado());
  }
});

// Função central de renderização do popup: lê o storage e pinta os elementos da tela HTML
function verificarEstado() {
  chrome.storage.local.get(['fila', 'total', 'processados', 'estado', 'itemAtual'], (dados) => {
    const telaUpload = document.getElementById('tela-upload');
    const telaProgresso = document.getElementById('tela-progresso');
    
    // Controle de qual "Tela" exibir (Upload inicial vs Tela de Progresso)
    if (!dados.estado || dados.estado === 'parado') {
      telaUpload.style.display = 'block';
      telaProgresso.style.display = 'none';
    } else {
      telaUpload.style.display = 'none';
      telaProgresso.style.display = 'block';

      // Variáveis de progresso matemático
      const total = dados.total || 0;
      const processados = dados.processados || 0;
      const item = dados.itemAtual;
      const porcentagem = total > 0 ? Math.floor((processados / total) * 100) : 0;

      // Define a String que aparece mostrando o que o robô está baixando agora
      let textoExibicao = "Aguardando...";
      if (item && item.codigo) {
        textoExibicao = `${item.codigo} - ${item.nome}`;
      } else if (dados.estado === 'parado' && processados === total && total > 0) {
        textoExibicao = "Concluído!"; // Exibe no fim da operação
      }

      // Manipulação dos elementos do DOM para refletir os números
      document.getElementById('lblProcessando').innerText = `Processando: ${processados} / ${total}`;
      document.getElementById('barraProgresso').style.width = `${porcentagem}%`; // Altera largura CSS
      document.getElementById('lblPorcentagem').innerText = `${porcentagem}%`;
      
      // Atualização dos textos e cores do botão de Pausa baseada no estado atual
      if (dados.estado === 'processando') {
        document.getElementById('lblArquivoAtual').innerText = `Baixando:\n${textoExibicao}`;
        document.getElementById('btnPausarContinuar').innerText = "Pausar";
        document.getElementById('btnPausarContinuar').style.backgroundColor = "#f1c40f"; // Amarelo
        document.getElementById('btnPausarContinuar').style.color = "#333";
      } else if (dados.estado === 'pausado') {
        document.getElementById('lblArquivoAtual').innerText = `Fila Pausada.\nÚltimo: ${textoExibicao}`;
        document.getElementById('btnPausarContinuar').innerText = "Continuar";
        document.getElementById('btnPausarContinuar').style.backgroundColor = "#2ecc71"; // Verde
        document.getElementById('btnPausarContinuar').style.color = "white";
      }
    }
  });
}

// Lógica de segurança de extensões: abre links (mailto, whatsapp) em novas abas em vez de bloquear no popup
document.querySelectorAll('.link-externo').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: e.currentTarget.href });
  });
});