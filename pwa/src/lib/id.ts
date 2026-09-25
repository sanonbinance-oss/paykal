/**
 * Identifiant unique côté client, avec repli pour les contextes non sécurisés
 * (ex. accès en http:// depuis une adresse IP de réseau local, où
 * `crypto.randomUUID` n'est pas disponible).
 */
export function identifiantLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
