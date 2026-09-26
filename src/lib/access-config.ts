// ============================================================
// ADMIN ACCESS BOOTSTRAP
// ------------------------------------------------------------
// Emails in this list are automatically granted the ADMIN role
// when they sign in. The admin then manages every other user's
// access (Support Agent grants/revokes) from the /admin CMS.
//
// IMPORTANT: keep this list identical to ADMIN_EMAILS in
// firestore.rules, otherwise Firestore will reject the role
// upgrade. Both lists must be lowercase.
// ============================================================

export const ADMIN_EMAILS: string[] = [
  // TODO: replace with your real admin email address
  'arish.rizvi.395@gmail.com'
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
