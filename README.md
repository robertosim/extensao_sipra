# SIPRA Beneficiários para PDF 🚀

Uma extensão para o Google Chrome (**Manifest V3**) desenvolvida para automatizar o acesso às páginas de espelhos de beneficiários do **SIPRA (INCRA)** e realizar o download automático dos relatórios em formato PDF de forma oculta e em lote.

---

## 🌟 Funcionalidades Principais

* **Geração Automatizada de PDF:** Utiliza a API nativa do Chrome Debugger (`Page.printToPDF`) para renderizar e baixar o espelho do beneficiário em PDF silenciosamente, sem precisar abrir a caixa de diálogo de impressão do navegador.
* **Downloads em Lote via CSV:** Carregue uma lista de códigos e nomes de beneficiários via arquivo `.csv` e a extensão processará toda a fila sequencialmente.
* **Organização Inteligente:** Os arquivos são salvos automaticamente e renomeados no padrão `Código - Nome do Beneficiário.pdf`, higienizando caracteres inválidos para evitar erros no sistema operacional.
* **Interface Intuitiva:** Painel limpo contendo barra de progresso em tempo real, indicação em texto do beneficiário atual e controles dinâmicos para *Pausar/Continuar* e *Cancelar* a extração.
* **Processamento em Segundo Plano (Service Worker):** A automação continua rodando de forma estável mesmo se você fechar o popup da extensão, gerenciando o fluxo através de abas ocultas.

---

## 📂 Estrutura do Projeto
```text
├── manifest.json       # Definições de permissões e metadados da extensão (MV3)
├── popup.html          # Estrutura HTML do painel de controle da extensão
├── popup.css           # Estilização visual moderna do painel
├── popup.js            # Lógica de interface, leitura do CSV e comunicação com o Service Worker
└── background.js       # Service worker (motor de automação, manipulação de abas, PDF e downloads)

```
---
## 🛠️ Como Instalar no Modo Desenvolvedor
Como Instalar no Modo Desenvolvedor

Faça o download ou clone este repositório no seu computador.

Abra o Google Chrome e acesse o endereço: chrome://extensions/.

No canto superior direito, ative a chave "Modo do desenvolvedor".

No canto superior esquerdo, clique em "Carregar sem compactação".

Selecione a pasta raiz que contém os arquivos deste projeto.

Pronto! O ícone da extensão estará disponível na sua barra de ferramentas de extensões.
---
## 📖 Instruções de Uso
🔹 Passo 1: Preparação do ArquivoCrie ou exporte um arquivo .csv contendo a lista de beneficiários. O sistema espera que o código de identificação esteja na 1ª coluna e o nome na 3ª coluna (separados por vírgula). A primeira linha (cabeçalho) é ignorada.
🔹 Passo 2: ExecuçãoClique no ícone da extensão para abrir o popup.Faça o upload do arquivo .csv preparado.Clique em Iniciar Extração.A extensão começará a processar a fila, abrindo abas em segundo plano, gerando o PDF e baixando automaticamente para a sua pasta padrão de downloads. Você pode acompanhar o progresso ou pausar a qualquer momento.
---
## ⚙️ Permissões Utilizadas
| Permissão | Finalidade |
| :--- | :--- |
| `downloads` | Para salvar os PDFs gerados diretamente na máquina do usuário. |
| `tabs` | Para criar abas em segundo plano e monitorar o carregamento das páginas do INCRA. |
| `debugger` | Para anexar o depurador do Chrome à aba e disparar o comando silencioso de impressão (Page.printToPDF). |
| `storage` | Para persistir a fila de trabalho e o estado (pausado/processando) mesmo que o popup seja fechado. |
| `activeTab` | Garante acesso temporário à aba ativa quando necessário pela interface. |
---
## 📞 Suporte e Contato
Desenvolvido por Roberto Simões. Caso precise de suporte personalizado, melhorias no sistema ou queira relatar algum comportamento indesejado, entre em contato pelos canais oficiais dispostos na interface:

✉️ E-mail: robsimoes@gmail.com

💬 WhatsApp: +55 (48) 99679-3828

💼 LinkedIn: linkedin.com/in/robertosim
