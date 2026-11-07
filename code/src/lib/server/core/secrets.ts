import { createHash, randomBytes } from 'node:crypto';

/** A long random URL-safe secret (256 bits). */
export const newSecret = () => randomBytes(32).toString('base64url');

/** What we store instead of a secret, so a leaked database doesn't leak working links or sessions. */
export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');
