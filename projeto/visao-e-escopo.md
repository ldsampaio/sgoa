## Documento de Visão e Escopo do Produto

**Nome do Produto:** Sistema de Gerenciamento de Orientações Acadêmicas (SGOA)

**Data:** 12 de setembro de 2026
**Versão:** 1.0

---

### 1. Visão do Produto

Fornecer uma plataforma web intuitiva e centralizada que simplifique e otimize o gerenciamento de todas as etapas do processo de orientação de Trabalhos de Conclusão de Curso (TCC), Mestrado e Doutorado para professores, alunos e coordenações, promovendo transparência, comunicação eficiente e acompanhamento eficaz do progresso acadêmico.

---

### 2. Objetivos de Negócio

*   **Reduzir a carga administrativa dos professores:** Automatizar tarefas repetitivas e centralizar informações para que os professores possam focar mais na orientação pedagógica.
*   **Melhorar a comunicação e colaboração:** Facilitar a interação entre orientadores, co-orientadores e alunos, garantindo que todos estejam alinhados sobre o progresso e as próximas etapas.
*   **Aumentar a transparência e o controle:** Oferecer uma visão clara do status de cada orientação para professores, alunos e coordenação, permitindo identificar gargalos e planejar ações.
*   **Padronizar processos:** Estabelecer um fluxo de trabalho consistente para o gerenciamento de orientações, independentemente do nível (TCC, Mestrado, Doutorado).
*   **Melhorar a qualidade das orientações:** Ao otimizar o gerenciamento, indiretamente contribuir para um acompanhamento mais próximo e eficaz dos trabalhos acadêmicos.

---

### 3. Público-Alvo e Personas

**Público-Alvo Principal:**

*   **Professores Universitários:** Orientadores e co-orientadores de TCC, Mestrado e Doutorado.
*   **Alunos de Graduação e Pós-Graduação:** Orientandos de TCC, Mestrado e Doutorado.
*   **Coordenações de Curso/Programa:** Responsáveis pela gestão acadêmica e acompanhamento do progresso dos alunos e professores.

**Personas (Exemplos):**

1.  **Professor Carlos (Orientador Atarefado)**
    *   **Perfil:** Professor titular, orienta 5 alunos de TCC, 3 de Mestrado e 2 de Doutorado. Tem muitas reuniões e prazos.
    *   **Necessidades:** Visão rápida de todas as suas orientações, lembretes de prazos, histórico de interações com cada aluno, fácil acesso aos documentos dos alunos.
    *   **Problemas Atuais:** Dificuldade em acompanhar o progresso de todos os alunos simultaneamente, perda de informações em e-mails e anotações diversas, sobrecarga administrativa.

2.  **Ana (Aluna de Mestrado)**
    *   **Perfil:** Aluna de mestrado, trabalha em tempo parcial, precisa conciliar estudos e trabalho.
    *   **Necessidades:** Acompanhar as tarefas e prazos definidos pelo orientador, submeter documentos facilmente, ter um canal claro de comunicação com o orientador, visualizar seu progresso.
    *   **Problemas Atuais:** Dificuldade em saber o que precisa ser feito e para quando, comunicação assíncrona e dispersa com o orientador.

3.  **Dra. Silvia (Coordenadora de Pós-Graduação)**
    *   **Perfil:** Coordenadora de um programa de pós-graduação, responsável por garantir a qualidade e o cumprimento dos prazos do programa.
    *   **Necessidades:** Visão geral do status das orientações no programa, identificar alunos em risco de atraso, gerar relatórios de produtividade e andamento, verificar a carga de orientação dos professores.
    *   **Problemas Atuais:** Falta de dados centralizados para monitoramento, dificuldade em intervir proativamente em casos de atraso, dependência de informações manuais dos professores.

---

### 4. Escopo Inicial (MVP - Produto Mínimo Viável)

**Funcionalidades INCLUÍDAS na primeira versão:**

*   **Gestão de Usuários:**
    *   Cadastro e autenticação de professores, alunos e coordenação.
    *   Definição de papéis (orientador, co-orientador, aluno, coordenador).
*   **Gestão de Orientações:**
    *   Criação e associação de orientações (TCC, Mestrado, Doutorado) a um orientador e um aluno.
    *   Possibilidade de adicionar co-orientadores.
    *   Definição de status da orientação (Em andamento, Concluída, Suspensa).
*   **Acompanhamento de Progresso:**
    *   Linha do tempo/feed de atividades por orientação.
    *   Registro de reuniões (data, participantes, pauta, decisões).
    *   Definição e acompanhamento de tarefas/marcos com prazos.
*   **Comunicação:**
    *   Módulo de mensagens internas associadas a cada orientação.
    *   Notificações básicas (tarefa atribuída, prazo próximo, nova mensagem).
*   **Gestão de Documentos:**
    *   Upload e download de arquivos (artigos, capítulos, relatórios) associados a cada orientação.
    *   Histórico de versões de documentos.
*   **Visualização:**
    *   Dashboard personalizado para professores (suas orientações, prazos próximos).
    *   Dashboard para alunos (sua orientação, tarefas, prazos).

**Funcionalidades EXCLUÍDAS da primeira versão (para futuras iterações):**

*   Integração com sistemas acadêmicos existentes (ex: SIGAA, Moodle).
*   Módulo de avaliação de orientações ou de desempenho de alunos/professores.
*   Geração automática de documentos oficiais (atas, declarações).
*   Ferramentas de colaboração em tempo real (edição conjunta de documentos).
*   Módulo de gestão de bancas examinadoras.
*   Relatórios avançados e customizáveis para coordenação.
*   Calendário integrado com sincronização externa (Google Calendar, Outlook).
*   Funcionalidades de inteligência artificial para sugestão de recursos ou análise de texto.

---

### 5. Restrições e Premissas de Alto Nível

**Restrições:**

*   **Orçamento:** Desenvolvimento inicial com recursos limitados, focando em funcionalidades essenciais.
*   **Tempo:** Prazo inicial de 6 meses para o MVP.
*   **Tecnologia:** A arquitetura e as tecnologias serão escolhidas para facilitar a geração de código por agentes de IA e a manutenção futura.
*   **Segurança:** A plataforma deve garantir a privacidade e a segurança dos dados acadêmicos e pessoais.

**Premissas:**

*   **Adoção:** Haverá engajamento e disposição dos professores e alunos para utilizar a nova ferramenta.
*   **Infraestrutura:** A infraestrutura de hospedagem será baseada em nuvem, garantindo escalabilidade e disponibilidade.
*   **Dados Iniciais:** Os dados iniciais de usuários e orientações serão inseridos manualmente ou via importação simples (CSV) na primeira versão.
*   **Feedback:** Haverá um processo contínuo de coleta de feedback dos usuários para guiar as próximas iterações do produto.
*   **Conectividade:** Os usuários terão acesso à internet para utilizar a aplicação.