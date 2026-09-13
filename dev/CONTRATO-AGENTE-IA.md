# SGOA ↔ Agente de IA — contrato Kafka

Este documento descreve a integração de avaliação automática, válida para o
**agente interno** (`npm run agent`, abaixo) e para um **agente externo**.
O SGOA nunca chama o agente diretamente: tudo passa pelos tópicos Kafka abaixo.
 Rode apenas UM deles por vez no mesmo tópico de pedidos (dois consumidores em
groups diferentes avaliariam tudo em duplicidade).

## Conexão

- Broker: `KAFKA_BROKERS` (local: `localhost:9092`, ver `dev/docker-compose.yml`).
- Tópicos:
  - Pedidos (SGOA → agente): `sgoa.avaliacoes.pendentes`
  - Resultados (agente → SGOA): `sgoa.avaliacoes.resultados`
- Use um `groupId` próprio (ex: `agente-avaliador`); o SGOA usa `sgoa-avaliacoes` só no tópico de resultados.

## 1. Consumir pedido (`sgoa.avaliacoes.pendentes`, key = `id_avaliacao`)

```json
{
  "id_avaliacao": "uuid",
  "id_documento": "uuid",
  "id_orientacao": "uuid",
  "tipo": "TCC | Mestrado | Doutorado | Artigo | Revisão Sistemática | Dataset | ...",
  "id_tipo": "uuid (referência à categoria; pode ser null em pedidos antigos)",
  "prompt": "texto do prompt configurado pelo professor para esta categoria",
  "documento": {
    "nome": "trabalho.pdf",
    "tipo_arquivo": "pdf",
    "versao": 1,
    "categoria": "Artigo (nome da categoria escolhida no upload)",
    "descricao": "Capítulo 2 ou null",
    "download_url": "http://api/api/documentos/<id>/download"
  },
  "aluno": { "nome": "..." },
  "professor": { "nome": "..." },
  "tentativas": 1,
  "enviado_em": "2026-09-13T04:00:00.000Z"
}
```

Baixar o arquivo: `GET download_url` com o token de serviço combinado previamente
(`AGENTE_IA_TOKEN`, via header `X-Agent-Token` ou `Authorization: Bearer <token>`).
Resposta `401` = token inválido; `404` = documento removido (nesse caso, publique `falha`).

## 2. Publicar resultado (`sgoa.avaliacoes.resultados`, **mesma key** = `id_avaliacao`)

Sucesso:

```json
{ "id_avaliacao": "uuid", "status": "concluída", "resultado": "parecer em Markdown...", "nota": "8,5 (opcional)" }
```

Falha:

```json
{ "id_avaliacao": "uuid", "status": "falha", "erro": "motivo legível" }
```

Regras:

- `status` só aceita `concluída` ou `falha`; qualquer outro valor é **ignorado**.
- `concluída` sem `resultado` é registrada como falha pelo SGOA.
- Mensagens de `id_avaliacao` desconhecido são ignoradas; reenvios do mesmo id são idempotentes.
- O `prompt` recebido já é o vigente do professor para a categoria — use-o como instrução principal.
- `tipo` é o **nome da categoria** escolhida no upload (não mais só o nível da orientação).
  Novas categorias podem surgir a qualquer momento (coordenadores cadastram);
  o agente deve tratar `tipo`/`documento.categoria` como texto livre.

## 3. Fluxo completo (exemplo)

1. Aluna envia `trabalho.pdf` no SGOA → pedido no tópico de pendentes.
2. Agente consome → baixa via `download_url` + token → avalia com `prompt`.
3. Agente publica `{ status: "concluída", resultado, nota? }` com a mesma key.
4. Worker do SGOA atualiza a avaliação e notifica professor e aluno no app.

## 4. Agente interno (OpenRouter, alternativa ao externo)

`src/workers/avaliacaoAgente.consumer.js` (`npm run agent`, serviço `sgoa-agent` no
compose, group `<KAFKA_GROUP_ID>-agent`). Implementa este mesmo contrato:

1. Consome o pedido → marca a avaliação como `processando` (visível no app).
2. Lê o arquivo do disco (`caminho_armazenamento`, mesmo volume) e extrai o texto
   (PDF via `unpdf`; txt/md direto; outros formatos → `falha` explicativa).
   Texto abaixo de `AGENT_MIN_CHARS` → `falha` (ex: PDF digitalizado).
3. **2 passes**: divide em chunks (`OPENROUTER_CHUNK_CHARS`, corta em parágrafo,
   mantém primeiros + último se exceder `OPENROUTER_MAX_CHUNKS`) → resume cada um
   sequencialmente → emite o parecer final com o `prompt` do professor.
4. Publica `{status, resultado}` no tópico de resultados; o worker existente finaliza.

Env: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (só `:free`),
`OPENROUTER_MAX_TOKENS_RESUMO/PARECER`, `TIMEOUT_MS`, `MAX_RETRIES` (backoff com
`Retry-After` em 429), `AGENT_ENABLED=false` desliga o consumo.
`OPENROUTER_BASE_URL` existe só para testes com stub local.

Notas: modelos free têm cotas baixas — 429 persistente vira `falha` com mensagem
para reenviar; o texto do aluno trafega para a OpenRouter (avaliar LGPD/termo);
SQLite compartilhado usa `busy_timeout` + commit só em desfecho permanente.
