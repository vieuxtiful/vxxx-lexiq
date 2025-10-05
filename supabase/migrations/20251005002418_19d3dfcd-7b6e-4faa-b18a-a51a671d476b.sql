-- Add translation_content column to analysis_sessions table for auto-populating recent sessions
ALTER TABLE analysis_sessions ADD COLUMN translation_content TEXT;