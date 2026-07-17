/**
 * A nav item is active on its own route and on anything nested under it, so
 * /leads/123 still lights up "Leads". Dashboard is matched exactly — otherwise
 * "/" logic would light it up everywhere.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
