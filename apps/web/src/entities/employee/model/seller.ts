/**
 * Seller entity — the employee the dashboard belongs to.
 *
 * The slice re-exports the domain model from `@t2-sales-hub/core`
 * and adds UI-level presentation helpers. Business rules stay in core.
 */

import type { Seller } from '@t2-sales-hub/core';

/** Full name split into a short display form. */
export function getSellerDisplayName(seller: Seller): string {
  return seller.name;
}

/** Builds the avatar fallback (initials) when no photo is available. */
export function getSellerInitials(seller: Seller): string {
  return (
    seller.initials ||
    seller.name
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2)
  );
}

export type { Seller };
