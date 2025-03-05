import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  try {
    console.log('Reading schema.sql file...');
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);
    console.log('Please run these statements using the MCP server SQL interface.');
    
    // Print each statement for manual execution
    statements.forEach((statement, index) => {
      console.log(`\n--- Statement ${index + 1}/${statements.length} ---`);
      console.log(statement + ';');
    });

    console.log('\nDatabase setup instructions completed. Please execute these statements in the Supabase SQL editor.');
  } catch (error) {
    console.error('Error reading schema file:', error);
    process.exit(1);
  }
}

setupDatabase(); 