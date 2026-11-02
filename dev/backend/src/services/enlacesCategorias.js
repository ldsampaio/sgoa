// Categorias de enlace Overleaf (RF.OV) — enum próprio, independente de tipos_documento
// (que serve os prompts de avaliação IA). Fonte única de verdade: o CHECK dos dois
// schemas é gerado a partir desta lista e a rota /enlaces/categorias devolve exatamente
// estas opções para a front.
//
// Atenção: adicionar uma categoria exige rebuild da tabela (CHECK não muda com
// ALTER TABLE) — mesmo idioma já usado em migrarTiposDocumento().
export const CATEGORIAS_ENLACE = [
  'TCC1',
  'TCC2',
  'Convalidação',
  'Projeto de Mestrado',
  'Projeto de Doutorado',
  'Dissertação',
  'Tese',
  'Artigo',
];

export const ESTADOS_ENLACE = ['Vigente', 'Encerrado'];

// Gera o bloco IN (...) do CHECK a partir da lista, para SQLite e Postgres não divergirem.
export function valoresDoCheck(valores) {
  return valores.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
}

export function categoriaValida(categoria) {
  return CATEGORIAS_ENLACE.includes(categoria);
}

export function estadoValido(estado) {
  return ESTADOS_ENLACE.includes(estado);
}
