# Security Specification: Variedades CS ERP

## 1. Data Invariants
1. Unauthenticated requests are completely denied from all reads and writes across all enterprise collections.
2. Only authenticated business staff (`request.auth != null`) can interact with operational documents.
3. Document IDs must conform to strict alphanumeric patterns: `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`) with a maximum length of 128 characters to prevent ID poisoning and denial-of-wallet string attacks.
4. Product prices and stock levels must be strictly non-negative numbers with bounded sizes.
5. Sales invoice documents, once marked as `Completada` or `Anulada`, cannot have their totals, invoiceNumber, or items altered to prevent retroactive fraud.
6. Cash session opening balances cannot be tampered with once opened; closing is restricted to cashier/admin.
7. Audit log entries (`auditEntries`) are strictly append-only: once created, updates and deletions are universally forbidden.
8. System administrator privileges are governed strictly via verified identity (`variedadescs.online@gmail.com` or trusted `/admins/{adminId}` documents).
9. Sensitive configuration (`/config/company`) can only be modified by authorized administrators.
10. All strings must have enforced `.size()` limits to prevent payload inflation and buffer attacks.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated Read on Sales**: Anonymous client requesting `/sales/SALE-001`. Expected: `PERMISSION_DENIED`.
2. **Ghost Field Injection in Products**: Creating a product containing `"isHacked": true` or unauthorized privilege flags. Expected: `PERMISSION_DENIED`.
3. **ID Poisoning in Products**: Writing to `/products/` with a 2048-byte malicious regex string as doc ID. Expected: `PERMISSION_DENIED`.
4. **Negative Price Exploit**: Creating a product with `price: -5000`. Expected: `PERMISSION_DENIED`.
5. **Tampering with Immutable Audit Log**: Attempting an `update` or `delete` on an existing `/auditEntries/{id}` record. Expected: `PERMISSION_DENIED`.
6. **Spoofed Admin Email**: Authenticated user with email `variedadescs.online@gmail.com` but unverified token attempting administrative write. Expected: `PERMISSION_DENIED`.
7. **Retroactive Sale Total Alteration**: Modifying `total` or `items` on a completed sale. Expected: `PERMISSION_DENIED`.
8. **Cash Drawer Inflation**: Unauthorized user modifying `openingBalance` on an active session. Expected: `PERMISSION_DENIED`.
9. **Oversized String in Client Name**: Ingestion of a 50,000-character payload into `clientName` to cause Denial of Wallet. Expected: `PERMISSION_DENIED`.
10. **Arbitrary Category Injection without required code**: Creating a category without `code` and `name`. Expected: `PERMISSION_DENIED`.
11. **Negative Stock Movement**: Submitting an inventory movement with negative quantity or invalid movement type. Expected: `PERMISSION_DENIED`.
12. **Company Configuration Hijack**: Non-admin user updating enterprise tax ID and company name in `/config/company`. Expected: `PERMISSION_DENIED`.

## 3. Test Runner Design
All twelve attack vectors are validated against the fortress rules implemented in `firestore.rules`.
