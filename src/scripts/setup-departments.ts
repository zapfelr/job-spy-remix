import { spawn } from 'child_process';
import path from 'path';

/**
 * Run a script and wait for it to complete
 * @param scriptPath Path to the script
 * @returns Promise that resolves when the script completes
 */
function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Running ${path.basename(scriptPath)} ===\n`);
    
    const process = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true,
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== ${path.basename(scriptPath)} completed successfully ===\n`);
        resolve();
      } else {
        reject(new Error(`Script ${scriptPath} exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to start script ${scriptPath}: ${err.message}`));
    });
  });
}

/**
 * Setup departments in the correct order
 */
async function setupDepartments() {
  try {
    // 1. Initialize departments
    await runScript(path.join(__dirname, 'init-departments.js'));
    
    // 2. Test department matcher
    await runScript(path.join(__dirname, 'test-department-matcher.js'));
    
    console.log('\n=== Department setup completed successfully ===\n');
  } catch (error) {
    console.error('Error setting up departments:', error);
    process.exit(1);
  }
}

// Run the setup
setupDepartments(); 