// O papel por sistema vem do backend (`sgoa.perfis` aceita mais de um papel por
// usuário — ex. Administrador e Professor). A checagem é por LISTA: comparar
// `user.papel === 'X'` perdia um dos papéis do usuário.
export function temPapel(user, ...papeis) {
  const doUsuario = Array.isArray(user?.papeis) && user.papeis.length ? user.papeis : [user?.papel];
  return doUsuario.some((p) => papeis.includes(p));
}
