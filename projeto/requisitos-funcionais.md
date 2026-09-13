## Documento de Requisitos Funcionais (FRD)

**Nome do Produto:** Sistema de Gerenciamento de Orientações Acadêmicas (SGOA)

**Data:** 12 de setembro de 2026
**Versão:** 1.0

---

### 1. Introdução

Este documento detalha os requisitos funcionais para a primeira versão (MVP) do Sistema de Gerenciamento de Orientações Acadêmicas (SGOA). Ele descreve as funcionalidades específicas que o sistema deve executar, servindo como base para o desenvolvimento e testes.

---

### 2. Lista de Funcionalidades

As funcionalidades estão agrupadas por módulo principal, conforme definido no escopo inicial.

#### 2.1. Gestão de Usuários

*   **RF.GU.001:** Permitir o cadastro de novos usuários pelo administrador e pelo coordenador; professores podem cadastrar alunos (somente tipo Aluno) e incluir alunos já cadastrados em suas orientações.
*   **RF.GU.002:** Permitir que usuários se autentiquem no sistema (login).
*   **RF.GU.003:** Permitir que usuários recuperem suas senhas.
*   **RF.GU.004:** Permitir que usuários visualizem e editem seu próprio perfil (nome, e-mail, etc.).
*   **RF.GU.005:** Atribuir e gerenciar papéis de usuário (orientador, co-orientador, aluno, coordenador, administrador).
*   **RF.GU.006:** Registrar para cada aluno somente a data de matrícula (obtida do sistema acadêmico; cadastro manual até a automatização) e calcular os prazos máximos a partir dela: conclusão do Mestrado (24 meses) e Doutorado (48 meses), exame de qualificação (14 meses no Mestrado, 24 no Doutorado); TCC não possui estes prazos. Parâmetros guardados em banco e editáveis pelo coordenador conforme o regulamento.
*   **RF.GU.007:** Enviar mensagem automatizada (na orientação, em nome do orientador) e e-mail automatizado ao aluno quando o prazo de qualificação ou defesa estiver chegando e a etapa não estiver concluída, conforme dias de antecedência e frequência (diária, semanal, mensal) configurados pelo professor para cada orientação. O e-mail parte do endereço institucional do orientador via SMTP da universidade, com as credenciais de cada professor guardadas cifradas no sistema (recadastro necessário ao trocar a senha institucional). A conclusão de cada etapa é marcada pelo orientador (captura automática do sistema acadêmico via RPA futuramente).

#### 2.2. Gestão de Orientações

*   **RF.GO.001:** Permitir que um professor (orientador) crie uma nova orientação, associando-a a um aluno e definindo o tipo (TCC, Mestrado, Doutorado).
*   **RF.GO.002:** Permitir que um professor (orientador) adicione um ou mais co-orientadores a uma orientação existente.
*   **RF.GO.003:** Permitir que um professor (orientador) ou coordenador altere o status de uma orientação (Em Andamento, Concluída, Suspensa, Cancelada).
*   **RF.GO.004:** Permitir que professores e alunos visualizem a lista de orientações em que estão envolvidos.
*   **RF.GO.005:** Permitir que coordenadores visualizem todas as orientações do seu programa/curso.

#### 2.3. Acompanhamento de Progresso

*   **RF.AP.001:** Permitir que o orientador registre uma reunião, incluindo data, participantes, pauta e decisões/próximos passos.
*   **RF.AP.002:** Permitir que o orientador crie tarefas ou marcos para uma orientação, atribuindo-os ao aluno ou a si mesmo e definindo um prazo.
*   **RF.AP.003:** Permitir que o aluno marque tarefas como concluídas.
*   **RF.AP.004:** Exibir uma linha do tempo ou feed de atividades para cada orientação, mostrando reuniões, tarefas criadas/concluídas e uploads de documentos.
*   **RF.AP.005:** Permitir que o orientador e o aluno visualizem o status de cada tarefa (pendente, em andamento, concluída, atrasada).

#### 2.4. Comunicação

*   **RF.CO.001:** Permitir que usuários (orientador, co-orientador, aluno) enviem mensagens de texto dentro do contexto de uma orientação específica.
*   **RF.CO.002:** Exibir um histórico de mensagens para cada orientação.
*   **RF.CO.003:** Gerar notificações para o usuário quando:
    *   Uma nova tarefa for atribuída.
    *   Um prazo de tarefa estiver se aproximando (ex: 3 dias antes).
    *   Uma nova mensagem for recebida em uma orientação.
    *   Um documento for carregado em uma orientação.

#### 2.5. Gestão de Documentos

*   **RF.GD.001:** Permitir que o aluno e o orientador façam upload de arquivos (ex: artigos, capítulos, relatórios) para uma orientação específica.
*   **RF.GD.002:** Permitir que o orientador e o aluno façam download de arquivos associados a uma orientação.
*   **RF.GD.003:** Manter um histórico de versões para cada documento carregado, permitindo a visualização de versões anteriores.
*   **RF.GD.004:** Exibir uma lista de documentos associados a cada orientação.

#### 2.6. Visualização (Dashboards)

*   **RF.VI.001:** Exibir um dashboard para o professor com:
    *   Lista de suas orientações.
    *   Tarefas pendentes e prazos próximos de suas orientações.
    *   Notificações recentes.
*   **RF.VI.002:** Exibir um dashboard para o aluno com:
    *   Detalhes de sua orientação atual.
    *   Tarefas pendentes e prazos próximos.
    *   Notificações recentes.
*   **RF.VI.003:** Exibir um dashboard para o coordenador com:
    *   Visão geral das orientações do programa/curso (número em andamento, concluídas).
    *   Lista de orientações com prazos críticos se aproximando (ex: defesa).

---

### 3. Casos de Uso

Apresentamos alguns casos de uso representativos para ilustrar a interação.

#### 3.1. Caso de Uso: Criar Nova Orientação

*   **Nome do Caso de Uso:** UC.GO.001 - Criar Nova Orientação
*   **Ator Principal:** Professor (Orientador)
*   **Pré-condições:**
    *   O professor está logado no sistema.
    *   O aluno a ser orientado já está cadastrado no sistema.
*   **Fluxo Principal:**
    1.  O professor acessa a funcionalidade "Minhas Orientações".
    2.  O professor clica no botão "Nova Orientação".
    3.  O sistema apresenta um formulário para criação de nova orientação.
    4.  O professor preenche os campos obrigatórios:
        *   Aluno (seleciona de uma lista de alunos cadastrados)
        *   Tipo de Orientação (TCC, Mestrado, Doutorado)
        *   Título Provisório do Trabalho (opcional)
        *   Data de Início (opcional)
    5.  O professor clica em "Salvar".
    6.  O sistema valida os dados.
    7.  O sistema cria a nova orientação com status "Em Andamento" e a associa ao professor e ao aluno.
    8.  O sistema exibe a página de detalhes da nova orientação.
*   **Fluxos Alternativos/Exceções:**
    *   **FA.1.1 - Aluno não encontrado:** Se o professor tentar selecionar um aluno não cadastrado, o sistema exibe uma mensagem de erro e sugere cadastrar o aluno primeiro.
    *   **FA.1.2 - Campos obrigatórios não preenchidos:** Se o professor não preencher um campo obrigatório, o sistema exibe uma mensagem de erro indicando o campo faltante.
    *   **FA.1.3 - Cancelamento:** O professor pode cancelar a operação a qualquer momento, retornando à lista de orientações.
*   **Pós-condições:**
    *   Uma nova orientação é registrada no sistema, vinculando o professor e o aluno.
    *   O aluno e o professor têm acesso à página de detalhes dessa orientação.

#### 3.2. Caso de Uso: Registrar Reunião de Orientação

*   **Nome do Caso de Uso:** UC.AP.001 - Registrar Reunião de Orientação
*   **Ator Principal:** Professor (Orientador)
*   **Pré-condições:**
    *   O professor está logado no sistema.
    *   A orientação já existe no sistema.
*   **Fluxo Principal:**
    1.  O professor acessa o dashboard e seleciona a orientação desejada.
    2.  Na página de detalhes da orientação, o professor clica na aba "Reuniões" ou em um botão "Registrar Reunião".
    3.  O sistema apresenta um formulário para registro de reunião.
    4.  O professor preenche os campos:
        *   Data e Hora da Reunião
        *   Participantes (seleciona entre aluno, co-orientador(es), outros - opcional)
        *   Pauta/Assuntos Discutidos
        *   Decisões/Próximos Passos
    5.  O professor clica em "Salvar".
    6.  O sistema valida os dados.
    7.  O sistema registra a reunião e a associa à orientação.
    8.  A reunião aparece na linha do tempo da orientação e na lista de reuniões.
*   **Fluxos Alternativos/Exceções:**
    *   **FA.2.1 - Campos obrigatórios não preenchidos:** Se o professor não preencher um campo obrigatório, o sistema exibe uma mensagem de erro.
    *   **FA.2.2 - Cancelamento:** O professor pode cancelar a operação a qualquer momento.
*   **Pós-condições:**
    *   A reunião é registrada e visível para todos os participantes da orientação.
    *   A linha do tempo da orientação é atualizada.

#### 3.3. Caso de Uso: Submeter Documento

*   **Nome do Caso de Uso:** UC.GD.001 - Submeter Documento
*   **Ator Principal:** Aluno
*   **Pré-condições:**
    *   O aluno está logado no sistema.
    *   A orientação já existe no sistema.
*   **Fluxo Principal:**
    1.  O aluno acessa o dashboard e seleciona sua orientação.
    2.  Na página de detalhes da orientação, o aluno clica na aba "Documentos" ou em um botão "Upload de Documento".
    3.  O sistema apresenta uma interface para upload de arquivo.
    4.  O aluno seleciona o arquivo em seu computador.
    5.  O aluno pode adicionar um comentário ou descrição para o documento (opcional).
    6.  O aluno clica em "Enviar" ou "Upload".
    7.  O sistema faz o upload do arquivo, associa-o à orientação e registra a versão.
    8.  O documento aparece na lista de documentos da orientação.
    9.  O sistema envia uma notificação ao orientador e co-orientador(es) sobre o novo documento.
*   **Fluxos Alternativos/Exceções:**
    *   **FA.3.1 - Erro no upload:** Se ocorrer um erro durante o upload (ex: arquivo muito grande, formato inválido), o sistema exibe uma mensagem de erro.
    *   **FA.3.2 - Cancelamento:** O aluno pode cancelar o upload a qualquer momento.
*   **Pós-condições:**
    *   O documento é armazenado e associado à orientação.
    *   O histórico de versões do documento é atualizado (se for uma nova versão de um documento existente).
    *   Orientadores são notificados.

---

### 4. Histórias de Usuário (User Stories)

Estas histórias complementam os requisitos, focando no valor para o usuário.

#### 4.1. Gestão de Usuários

*   **Como um Administrador**, eu quero **cadastrar novos professores e alunos**, para que eles possam **acessar o sistema e participar das orientações**.
*   **Como um Usuário**, eu quero **fazer login com meu e-mail e senha**, para que eu possa **acessar minhas informações e funcionalidades**.
*   **Como um Usuário**, eu quero **recuperar minha senha caso a esqueça**, para que eu possa **continuar acessando o sistema sem interrupções**.

#### 4.2. Gestão de Orientações

*   **Como um Professor Orientador**, eu quero **criar uma nova orientação, associando um aluno a ela**, para que eu possa **começar a gerenciar o trabalho desse aluno**.
*   **Como um Professor Orientador**, eu quero **adicionar um co-orientador a uma orientação**, para que ele possa **colaborar no acompanhamento do aluno**.
*   **Como um Aluno**, eu quero **ver a minha orientação e quem são meus orientadores**, para que eu saiba **com quem estou trabalhando**.

#### 4.3. Acompanhamento de Progresso

*   **Como um Professor Orientador**, eu quero **registrar os detalhes de cada reunião com o aluno**, para que eu tenha um **histórico claro das discussões e decisões**.
*   **Como um Professor Orientador**, eu quero **criar tarefas e definir prazos para o aluno**, para que ele saiba **o que precisa ser feito e quando**.
*   **Como um Aluno**, eu quero **marcar uma tarefa como concluída**, para que meu orientador **saiba do meu progresso**.
*   **Como um Aluno**, eu quero **ver uma linha do tempo das atividades da minha orientação**, para que eu possa **acompanhar o que já foi feito e o que está por vir**.

#### 4.4. Comunicação

*   **Como um Usuário (Professor, Aluno, Co-orientador)**, eu quero **enviar mensagens diretamente na plataforma para os participantes da orientação**, para que a **comunicação fique centralizada e contextualizada**.
*   **Como um Usuário**, eu quero **receber notificações sobre novas mensagens, tarefas e prazos**, para que eu **não perca informações importantes**.

#### 4.5. Gestão de Documentos

*   **Como um Aluno**, eu quero **fazer upload de versões do meu trabalho (capítulos, artigos)**, para que meu orientador **possa revisá-los facilmente**.
*   **Como um Professor Orientador**, eu quero **acessar e baixar os documentos submetidos pelos meus alunos**, para que eu possa **revisá-los e dar feedback**.
*   **Como um Professor Orientador ou Aluno**, eu quero **ver o histórico de versões de um documento**, para que possamos **acompanhar a evolução do trabalho**.

#### 4.6. Visualização (Dashboards)

*   **Como um Professor Orientador**, eu quero **ter um dashboard que mostre minhas orientações ativas e as próximas tarefas/prazos**, para que eu possa **gerenciar meu tempo de forma eficiente**.
*   **Como um Aluno**, eu quero **ter um dashboard que mostre o status da minha orientação e minhas tarefas pendentes**, para que eu possa **me organizar melhor**.
*   **Como um Coordenador**, eu quero **ter uma visão geral das orientações do meu programa**, para que eu possa **monitorar o andamento e identificar possíveis problemas**.