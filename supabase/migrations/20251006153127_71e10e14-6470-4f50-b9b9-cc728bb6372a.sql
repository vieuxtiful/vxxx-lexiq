-- Add project type and source language columns to projects table
ALTER TABLE projects 
ADD COLUMN project_type TEXT NOT NULL DEFAULT 'monolingual' 
CHECK (project_type IN ('monolingual', 'bilingual'));

ALTER TABLE projects 
ADD COLUMN source_language TEXT;

CREATE INDEX idx_projects_type ON projects(project_type);

-- Add source content columns to analysis_sessions table
ALTER TABLE analysis_sessions 
ADD COLUMN source_content TEXT;

ALTER TABLE analysis_sessions 
ADD COLUMN source_word_count INTEGER DEFAULT 0;

-- Add project type context to file_uploads table
ALTER TABLE file_uploads 
ADD COLUMN project_type TEXT;

ALTER TABLE file_uploads 
ADD COLUMN has_source_content BOOLEAN DEFAULT FALSE;