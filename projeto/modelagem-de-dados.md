## Documento de Modelagem de Dados

**Nome do Produto:** Sistema de Gerenciamento de Orientações Acadêmicas (SGOA)

**Data:** 12 de setembro de 2026
**Versão:** 1.0

---

### 1. Introdução

Este documento descreve a estrutura dos dados que serão armazenados e gerenciados pelo Sistema de Gerenciamento de Orientações Acadêmicas (SGOA). Ele inclui um Diagrama de Entidade-Relacionamento (DER) para visualização das entidades e seus relacionamentos, e um Dicionário de Dados detalhando cada entidade e seus atributos.

---

### 2. Diagrama de Entidade-Relacionamento (DER)

O DER abaixo representa as principais entidades do sistema e como elas se relacionam.

```mermaid
erDiagram
    USUARIO ||--o{ PERFIL : "tem"
    USUARIO {
        UUID id_usuario PK
        VARCHAR nome
        VARCHAR email
        VARCHAR senha_hash
        VARCHAR tipo_usuario "Professor, Aluno, Coordenador"
        BOOLEAN ativo
        TIMESTAMP data_cadastro
        TIMESTAMP data_atualizacao
    }

    PERFIL {
        UUID id_perfil PK
        UUID id_usuario FK
        VARCHAR papel "Orientador, Co-orientador, Aluno, Coordenador"
    }

    ORIENTACAO ||--o{ REUNIAO : "contém"
    ORIENTACAO ||--o{ TAREFA : "contém"
    ORIENTACAO ||--o{ DOCUMENTO : "contém"
    ORIENTACAO ||--o{ MENSAGEM : "contém"
    ORIENTACAO ||--|{ PROFESSOR : "orienta"
    ORIENTACAO ||--|{ ALUNO : "é_orientado"
    ORIENTACAO ||--o{ CO_ORIENTADOR : "tem"
    ORIENTACAO {
        UUID id_orientacao PK
        UUID id_orientador FK "Professor"
        UUID id_aluno FK "Aluno"
        VARCHAR tipo "TCC, Mestrado, Doutorado"
        VARCHAR titulo_provisorio
        VARCHAR status "Em Andamento, Concluída, Suspensa, Cancelada"
        DATE data_inicio
        DATE data_previsao_fim
        DATE qualificacao_concluida_em "marcada pelo orientador; RPA futuro"
        DATE defesa_concluida_em "marcada pelo orientador; RPA futuro"
        VARCHAR origem_marcacao "manual, rpa"
        TIMESTAMP data_cadastro
        TIMESTAMP data_atualizacao
    }

    CONFIG_AVISOS_ORIENTACAO {
        UUID id_orientacao PK/FK
        INTEGER dias_antes_qualificacao "padrão 30"
        INTEGER dias_antes_defesa "padrão 30"
        VARCHAR frequencia "diaria, semanal, mensal"
    }

    LEMBRETE_ENVIADO {
        UUID id_lembrete PK
        UUID id_orientacao FK
        VARCHAR etapa "qualificacao, defesa"
        TIMESTAMP data_envio
    }

    EMAIL_INTEGRACAO {
        UUID id_usuario PK/FK
        VARCHAR email_remetente "e-mail do professor"
        VARCHAR smtp_user
        VARCHAR smtp_pass_enc "cifrada (SMTP_TOKEN_KEY), nunca exposta"
        BOOLEAN requer_reconexao "senha institucional trocada"
    }

    PROFESSOR ||--|{ USUARIO : "é_um"
    PROFESSOR {
        UUID id_professor PK
        UUID id_usuario FK
        VARCHAR matricula
        VARCHAR departamento
    }

    ALUNO ||--|{ USUARIO : "é_um"
    ALUNO {
        UUID id_aluno PK
        UUID id_usuario FK
        VARCHAR matricula
        VARCHAR curso
        VARCHAR programa_pos
        DATE data_matricula "origem: sistema acadêmico (manual por ora)"
    }

    PARAMETROS_PRAZOS {
        VARCHAR nivel PK "TCC, Mestrado, Doutorado"
        INTEGER prazo_conclusao_meses "NULL = sem prazo; padrão Mestrado 24, Doutorado 48"
        INTEGER prazo_qualificacao_meses "NULL = sem prazo; padrão Mestrado 14, Doutorado 24"
        TIMESTAMP data_atualizacao
    }

    CO_ORIENTADOR ||--|{ PROFESSOR : "é_um"
    CO_ORIENTADOR {
        UUID id_co_orientador PK
        UUID id_orientacao FK
        UUID id_professor FK
    }

    REUNIAO {
        UUID id_reuniao PK
        UUID id_orientacao FK
        TIMESTAMP data_hora
        TEXT pauta
        TEXT decisoes_proximos_passos
        VARCHAR participantes "Lista de IDs de usuários"
        TIMESTAMP data_cadastro
    }

    TAREFA {
        UUID id_tarefa PK
        UUID id_orientacao FK
        UUID id_responsavel FK "Aluno ou Professor"
        VARCHAR descricao
        DATE data_limite
        VARCHAR status "Pendente, Em Andamento, Concluída, Atrasada"
        TIMESTAMP data_cadastro
        TIMESTAMP data_atualizacao
    }

    DOCUMENTO {
        UUID id_documento PK
        UUID id_orientacao FK
        UUID id_uploader FK "Usuário que fez o upload"
        VARCHAR nome_arquivo
        VARCHAR tipo_arquivo
        VARCHAR caminho_armazenamento
        TEXT descricao
        INTEGER versao
        TIMESTAMP data_upload
    }

    MENSAGEM {
        UUID id_mensagem PK
        UUID id_orientacao FK
        UUID id_remetente FK "Usuário que enviou"
        TEXT conteudo
        TIMESTAMP data_envio
    }
```

---

### 3. Dicionário de Dados

#### 3.1. Entidade: `USUARIO`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_usuario`      | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `nome`            | VARCHAR      | 255             | Não Nulo                                             |
| `email`           | VARCHAR      | 255             | Não Nulo, Único, Formato de e-mail válido            |
| `senha_hash`      | VARCHAR      | 255             | Não Nulo, Armazena hash da senha                     |
| `tipo_usuario`    | VARCHAR      | 50              | Não Nulo, Valores: 'Professor', 'Aluno', 'Coordenador' |
| `ativo`           | BOOLEAN      | -               | Não Nulo, Padrão: TRUE                               |
| `data_cadastro`   | TIMESTAMP    | -               | Não Nulo, Gerado automaticamente                     |
| `data_atualizacao`| TIMESTAMP    | -               | Gerado automaticamente na atualização                |

#### 3.2. Entidade: `PERFIL`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_perfil`       | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_usuario`      | UUID         | -               | Chave Estrangeira para `USUARIO.id_usuario`, Não Nulo |
| `papel`           | VARCHAR      | 50              | Não Nulo, Valores: 'Orientador', 'Co-orientador', 'Aluno', 'Coordenador' |

#### 3.3. Entidade: `PROFESSOR`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_professor`    | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_usuario`      | UUID         | -               | Chave Estrangeira para `USUARIO.id_usuario`, Não Nulo, Único |
| `matricula`       | VARCHAR      | 50              | Não Nulo, Único                                      |
| `departamento`    | VARCHAR      | 100             | Pode ser Nulo                                        |

#### 3.4. Entidade: `ALUNO`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_aluno`        | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_usuario`      | UUID         | -               | Chave Estrangeira para `USUARIO.id_usuario`, Não Nulo, Único |
| `matricula`       | VARCHAR      | 50              | Não Nulo, Único                                      |
| `curso`           | VARCHAR      | 100             | Não Nulo                                             |
| `programa_pos`    | VARCHAR      | 100             | Pode ser Nulo (para alunos de graduação)             |

#### 3.5. Entidade: `ORIENTACAO`

| Atributo              | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :-------------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_orientacao`       | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_orientador`       | UUID         | -               | Chave Estrangeira para `PROFESSOR.id_professor`, Não Nulo |
| `id_aluno`            | UUID         | -               | Chave Estrangeira para `ALUNO.id_aluno`, Não Nulo    |
| `tipo`                | VARCHAR      | 50              | Não Nulo, Valores: 'TCC', 'Mestrado', 'Doutorado'    |
| `titulo_provisorio`   | VARCHAR      | 500             | Pode ser Nulo                                        |
| `status`              | VARCHAR      | 50              | Não Nulo, Valores: 'Em Andamento', 'Concluída', 'Suspensa', 'Cancelada' |
| `data_inicio`         | DATE         | -               | Pode ser Nulo                                        |
| `data_previsao_fim`   | DATE         | -               | Pode ser Nulo                                        |
| `data_cadastro`       | TIMESTAMP    | -               | Não Nulo, Gerado automaticamente                     |
| `data_atualizacao`    | TIMESTAMP    | -               | Gerado automaticamente na atualização                |

#### 3.6. Entidade: `CO_ORIENTADOR`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_co_orientador`| UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_orientacao`   | UUID         | -               | Chave Estrangeira para `ORIENTACAO.id_orientacao`, Não Nulo |
| `id_professor`    | UUID         | -               | Chave Estrangeira para `PROFESSOR.id_professor`, Não Nulo |
| **Restrição:** Uma orientação pode ter múltiplos co-orientadores, e um professor pode ser co-orientador em múltiplas orientações. |

#### 3.7. Entidade: `REUNIAO`

| Atributo                  | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :------------------------ | :----------- | :-------------- | :--------------------------------------------------- |
| `id_reuniao`              | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_orientacao`           | UUID         | -               | Chave Estrangeira para `ORIENTACAO.id_orientacao`, Não Nulo |
| `data_hora`               | TIMESTAMP    | -               | Não Nulo                                             |
| `pauta`                   | TEXT         | -               | Pode ser Nulo                                        |
| `decisoes_proximos_passos`| TEXT         | -               | Pode ser Nulo                                        |
| `participantes`           | VARCHAR      | 500             | Lista de IDs de usuários (ex: JSON array ou string separada por vírgulas) |
| `data_cadastro`           | TIMESTAMP    | -               | Não Nulo, Gerado automaticamente                     |

#### 3.8. Entidade: `TAREFA`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_tarefa`       | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_orientacao`   | UUID         | -               | Chave Estrangeira para `ORIENTACAO.id_orientacao`, Não Nulo |
| `id_responsavel`  | UUID         | -               | Chave Estrangeira para `USUARIO.id_usuario`, Não Nulo |
| `descricao`       | TEXT         | -               | Não Nulo                                             |
| `data_limite`     | DATE         | -               | Pode ser Nulo                                        |
| `status`          | VARCHAR      | 50              | Não Nulo, Valores: 'Pendente', 'Em Andamento', 'Concluída', 'Atrasada' |
| `data_cadastro`   | TIMESTAMP    | -               | Não Nulo, Gerado automaticamente                     |
| `data_atualizacao`| TIMESTAMP    | -               | Gerado automaticamente na atualização                |

#### 3.9. Entidade: `DOCUMENTO`

| Atributo              | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :-------------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_documento`        | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_orientacao`       | UUID         | -               | Chave Estrangeira para `ORIENTACAO.id_orientacao`, Não Nulo |
| `id_uploader`         | UUID         | -               | Chave Estrangeira para `USUARIO.id_usuario`, Não Nulo |
| `nome_arquivo`        | VARCHAR      | 255             | Não Nulo                                             |
| `tipo_arquivo`        | VARCHAR      | 50              | Ex: 'pdf', 'docx', 'odt'                             |
| `caminho_armazenamento`| VARCHAR      | 500             | Não Nulo, Caminho ou URL para o arquivo armazenado   |
| `descricao`           | TEXT         | -               | Pode ser Nulo                                        |
| `versao`              | INTEGER      | -               | Não Nulo, Padrão: 1, Incrementa a cada upload do mesmo documento |
| `data_upload`         | TIMESTAMP    | -               | Não Nulo, Gerado automaticamente                     |

#### 3.10. Entidade: `MENSAGEM`

| Atributo          | Tipo de Dado | Tamanho/Formato | Restrições/Observações                               |
| :---------------- | :----------- | :-------------- | :--------------------------------------------------- |
| `id_mensagem`     | UUID         | -               | Chave Primária, Gerado automaticamente               |
| `id_orientacao`   | UUID         | -               | Chave Estrangeira para `ORIENTACAO.id_orientacao`, Não Nulo |
| `id_remetente`    | UUID         | -               | Chave Estrangeira para `USUARIO.id_usuario`, Não Nulo |
| `conteudo`        | TEXT         | -               | Não Nulo                                             |
| `data_envio`      | TIMESTAMP    | -               | Não Nulo, Gerado automaticamente                     |