/**
 * Express request augmentation.
 *
 * The current seller and the curator role are resolved by the server.
 * They are attached to the request once, in the middleware below, so a
 * handler can never read them from the request body or query string.
 */

import type { Request } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The seller the request acts on. Resolved server-side. */
      sellerId: string;
    }
  }
}

/** The seller used when nobody is signed in — the demo mode. */
const DEMO_SELLER_ID = 'DEMO-0001';

/**
 * Resolves the acting seller.
 *
 * When someone is signed in through the ABC T2 portal, the request
 * acts on their own account. Without a session the demo seller is used,
 * so the application still works before the portal is available.
 */
export function sellerContext() {
  return (req: Request, _res: Request['res'], next: () => void): void => {
    req.sellerId = req.user?.id ?? DEMO_SELLER_ID;
    next();
  };
}
