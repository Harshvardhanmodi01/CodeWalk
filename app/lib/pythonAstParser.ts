import { spawn } from 'child_process';
import path from 'path';

export async function analyzePythonCode(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'scripts', 'python_ast.py');
    const proc = spawn('python', [pythonScript]);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python AST failed: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) reject(new Error(result.error));
        else resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    
    proc.stdin.write(code);
    proc.stdin.end();
  });
}