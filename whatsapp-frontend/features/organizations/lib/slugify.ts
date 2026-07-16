/**
 * Builds the slug the create call requires. It is not a form field: the slug is
 * an internal identifier today, and it is globally unique in Better Auth — two
 * people naming their organization "Minha Empresa" would collide. The random
 * suffix is what keeps them apart.
 *
 * The uniqueness has to be solved here, by the caller: Better Auth checks the
 * slug before running its own create hook, so a taken slug cannot be repaired
 * server-side.
 */
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const suffix = crypto.randomUUID().slice(0, 8);

  return base ? `${base}-${suffix}` : suffix;
}
