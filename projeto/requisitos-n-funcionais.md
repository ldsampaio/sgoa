## Documento de Requisitos Não Funcionais (NFRD)

**Nome do Produto:** Sistema de Gerenciamento de Orientações Acadêmicas (SGOA)

**Data:** 12 de setembro de 2026
**Versão:** 1.0

---

### 1. Introdução

Este documento detalha os requisitos não funcionais para a primeira versão (MVP) do Sistema de Gerenciamento de Orientações Acadêmicas (SGOA). Estes requisitos descrevem as qualidades e restrições do sistema, influenciando diretamente sua arquitetura, design e implementação.

---

### 2. Requisitos Não Funcionais

#### 2.1. Desempenho

*   **NFR.PERF.001 - Tempo de Resposta:** O sistema deverá responder a 90% das requisições de usuário (ex: carregamento de página, submissão de formulário) em até 3 segundos, sob condições normais de uso.
*   **NFR.PERF.002 - Capacidade de Usuários Simultâneos:** O sistema deverá suportar um mínimo de 100 usuários ativos simultaneamente sem degradação perceptível de desempenho.
*   **NFR.PERF.003 - Carregamento de Listas:** Listas de orientações ou documentos com até 50 itens deverão ser carregadas em no máximo 2 segundos.
*   **NFR.PERF.004 - Upload de Arquivos:** O upload de arquivos de até 50MB deverá ser concluído em até 10 segundos, considerando uma conexão de internet padrão (ex: 100Mbps).

#### 2.2. Segurança

*   **NFR.SEG.001 - Autenticação:** O sistema deverá exigir autenticação de todos os usuários para acesso às funcionalidades, utilizando e-mail e senha.
*   **NFR.SEG.002 - Autorização (Controle de Acesso Baseado em Papéis - RBAC):** O sistema deverá implementar controle de acesso baseado em papéis, garantindo que cada tipo de usuário (aluno, professor, coordenador, administrador) tenha acesso apenas às funcionalidades e dados pertinentes ao seu perfil.
    *   Ex: Alunos só podem ver suas próprias orientações.
    *   Ex: Professores só podem gerenciar suas orientações.
    *   Ex: Coordenadores podem visualizar todas as orientações do seu programa.
*   **NFR.SEG.003 - Proteção de Dados em Trânsito:** Todas as comunicações entre o cliente (navegador) e o servidor deverão ser criptografadas usando HTTPS (TLS 1.2 ou superior).
*   **NFR.SEG.004 - Proteção de Dados em Repouso:** Dados sensíveis (ex: senhas) deverão ser armazenados de forma criptografada no banco de dados.
*   **NFR.SEG.005 - Conformidade com LGPD:** O sistema deverá ser projetado e implementado em conformidade com a Lei Geral de Proteção de Dados (LGPD) brasileira, garantindo a privacidade e a proteção dos dados pessoais dos usuários.
*   **NFR.SEG.006 - Prevenção de Ataques Comuns:** O sistema deverá ser resistente a vulnerabilidades comuns como SQL Injection, Cross-Site Scripting (XSS) e Cross-Site Request Forgery (CSRF).
*   **NFR.SEG.007 - Políticas de Senha:** O sistema deverá impor políticas de complexidade de senha (mínimo de 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais).

#### 2.3. Usabilidade

*   **NFR.USAB.001 - Facilidade de Uso:** A interface do usuário deverá ser intuitiva, permitindo que usuários com conhecimento básico de informática realizem as tarefas principais (ex: criar orientação, submeter documento) com treinamento mínimo ou autoexplicativo.
*   **NFR.USAB.002 - Consistência da Interface:** A interface gráfica deverá manter um padrão visual e de interação consistente em todas as telas e funcionalidades.
*   **NFR.USAB.003 - Feedback ao Usuário:** O sistema deverá fornecer feedback claro e imediato para as ações do usuário (ex: mensagens de sucesso, erro, carregamento).
*   **NFR.USAB.004 - Acessibilidade (Nível Básico):** A interface deverá seguir diretrizes básicas de acessibilidade web (ex: contraste de cores adequado, uso de tags semânticas, navegação por teclado para elementos interativos).
*   **NFR.USAB.005 - Clareza das Mensagens:** Mensagens de erro e informativas deverão ser claras, concisas e orientadas à solução.

#### 2.4. Confiabilidade

*   **NFR.CONF.001 - Disponibilidade:** O sistema deverá estar disponível 99% do tempo (excluindo janelas de manutenção programadas).
*   **NFR.CONF.002 - Recuperação de Falhas:** Em caso de falha do sistema (ex: queda de servidor), os dados deverão ser recuperáveis a partir do último backup em até 4 horas.
*   **NFR.CONF.003 - Integridade dos Dados:** O sistema deverá garantir a integridade dos dados, prevenindo perdas ou corrupção de informações em caso de falhas.
*   **NFR.CONF.004 - Backups:** Deverão ser realizados backups diários completos do banco de dados e dos arquivos, com retenção de pelo menos 7 dias.

#### 2.5. Manutenibilidade

*   **NFR.MANUT.001 - Modularidade:** O código-fonte deverá ser modular e bem organizado, facilitando a compreensão e a modificação por novos desenvolvedores.
*   **NFR.MANUT.002 - Documentação de Código:** O código deverá ser bem comentado e seguir padrões de codificação estabelecidos.
*   **NFR.MANUT.003 - Facilidade de Correção de Bugs:** A arquitetura do sistema deverá permitir a identificação e correção de bugs de forma eficiente.
*   **NFR.MANUT.004 - Facilidade de Evolução:** O sistema deverá ser projetado para permitir a fácil adição de novas funcionalidades e a modificação das existentes sem impactar negativamente outras partes do sistema.

#### 2.6. Portabilidade

*   **NFR.PORT.001 - Compatibilidade com Navegadores:** O sistema deverá ser totalmente funcional e ter uma experiência de usuário consistente nos navegadores web mais recentes (Chrome, Firefox, Edge, Safari).
*   **NFR.PORT.002 - Responsividade:** A interface do usuário deverá ser responsiva, adaptando-se a diferentes tamanhos de tela (desktops, laptops, tablets e smartphones), garantindo usabilidade em todos eles.

#### 2.7. Escalabilidade

*   **NFR.ESCAL.001 - Escalabilidade Horizontal:** A arquitetura do sistema deverá permitir a adição de mais servidores de aplicação e/ou banco de dados para suportar um aumento futuro no número de usuários ou na carga de processamento.
*   **NFR.ESCAL.002 - Escalabilidade de Dados:** O banco de dados deverá ser capaz de lidar com um crescimento significativo no volume de dados (ex: milhares de orientações, milhões de registros de atividades) sem degradação de desempenho.

#### 2.8. Tecnologia (Premissas Iniciais para Geração por IA)

*   **NFR.TEC.001 - Linguagem de Programação (Backend):** Preferencialmente Python (com frameworks como Django ou Flask) ou Node.js (com Express), devido à sua popularidade e ecossistema robusto para integração com ferramentas de IA.
*   **NFR.TEC.002 - Linguagem de Programação (Frontend):** JavaScript com um framework moderno (ex: React, Vue.js ou Angular) para criar uma interface de usuário dinâmica e responsiva.
*   **NFR.TEC.003 - Banco de Dados:** Relacional (ex: PostgreSQL ou MySQL) para garantir integridade transacional e facilidade de modelagem de dados complexos.
*   **NFR.TEC.004 - Hospedagem:** Plataforma de nuvem (ex: AWS, Google Cloud, Azure) para garantir escalabilidade, disponibilidade e gerenciamento de infraestrutura.
*   **NFR.TEC.005 - Ferramentas de Geração de Código:** A arquitetura deverá ser compatível com ferramentas e agentes de IA que geram código, priorizando padrões e convenções que facilitem essa geração e manutenção.