-- Add a JSONB column for stats to the agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"warmth": 5, "humor": 5, "assertiveness": 5, "creativity": 5, "logic": 5}'::jsonb;
