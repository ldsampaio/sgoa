// T10: nenhuma rota do sgoa aceita campo `senha`/`password`. O sgoa não autentica
// credencial — a rejeição é explícita, não um efeito colateral de parsing.
// A resposta nunca repete o valor recebido.
const CAMPOS_PROIBIDOS = new Set([
  'senha',
  'password',
  'senha_hash',
  'senhaHash',
  'novaSenha',
  'nova_senha',
  'mustChangePassword',
]);

export function rejeitaCredencial(req, res, next) {
  const corpo = req.body;
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return next();

  const encontrados = Object.keys(corpo).filter((campo) => CAMPOS_PROIBIDOS.has(String(campo).toLowerCase()));
  if (encontrados.length > 0) {
    return res.status(400).json({
      code: 'CREDENCIAL_NAO_ACEITA',
      message: 'O sgoa não aceita credencial. A autenticação é feita pelo saga.',
    });
  }

  next();
}
