-- Create API errors table for monitoring
CREATE TABLE IF NOT EXISTS api_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  company_name TEXT NOT NULL,
  api_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS api_errors_company_id_idx ON api_errors(company_id);
CREATE INDEX IF NOT EXISTS api_errors_created_at_idx ON api_errors(created_at);

-- Create function to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION create_api_errors_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_errors') THEN
    CREATE TABLE api_errors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID REFERENCES companies(id),
      company_name TEXT NOT NULL,
      api_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX api_errors_company_id_idx ON api_errors(company_id);
    CREATE INDEX api_errors_created_at_idx ON api_errors(created_at);
  END IF;
END;
$$ LANGUAGE plpgsql; 