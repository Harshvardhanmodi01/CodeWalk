"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePythonCode = analyzePythonCode;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
async function analyzePythonCode(code) {
    return new Promise((resolve, reject) => {
        const pythonScript = path_1.default.join(process.cwd(), 'scripts', 'python_ast.py');
        const proc = (0, child_process_1.spawn)('python', [pythonScript]);
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
                if (result.error)
                    reject(new Error(result.error));
                else
                    resolve(result);
            }
            catch (e) {
                reject(e);
            }
        });
        proc.stdin.write(code);
        proc.stdin.end();
    });
}
