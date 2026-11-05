// bcrypt cost factor for all password hashes. Existing hashes made with a lower
// cost still verify; they pick up the new cost the next time the password changes.
export const BCRYPT_ROUNDS = 12;
