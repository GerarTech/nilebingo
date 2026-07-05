-- Add unique constraint on games.code to prevent duplicate game creation race conditions.
-- First, merge any duplicate game records into the earliest-created one.

DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
  del_id UUID;
BEGIN
  FOR dup IN (
    SELECT code, array_agg(id ORDER BY created_at) as ids
    FROM games
    GROUP BY code
    HAVING COUNT(*) > 1
  )
  LOOP
    keep_id := dup.ids[1];
    FOR i IN 2..array_length(dup.ids, 1)
    LOOP
      del_id := dup.ids[i];
      -- Move any game_players from duplicate to the kept game
      UPDATE game_players SET game_id = keep_id WHERE game_id = del_id;
      -- Delete the duplicate game
      DELETE FROM games WHERE id = del_id;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE games ADD CONSTRAINT games_code_unique UNIQUE (code);
