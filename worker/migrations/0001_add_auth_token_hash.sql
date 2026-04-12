-- Adds the auth_token_hash column used by the owner-proof auth model.
-- NULL means "unclaimed" — the next POST with a matching user_hash will claim it (TOFU).
ALTER TABLE buddies ADD COLUMN auth_token_hash TEXT;
