import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

export interface ASTAnalysis {
  functions: { name: string; startLine: number; endLine: number }[];
  conditionals: { line: number }[];
  loops: { type: string; line: number }[];
  tryCatch: { line: number }[];
  asyncCalls: { callee: string; line: number }[];
  complexity: number;
}

export function analyzeCodeAST(code: string, filename: string): ASTAnalysis {
  const result: ASTAnalysis = {
    functions: [],
    conditionals: [],
    loops: [],
    tryCatch: [],
    asyncCalls: [],
    complexity: 0,
  };

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx'
      ],
      tokens: false,
      ranges: false,
    });
  } catch (err) {
    console.warn(`AST parsing failed for ${filename}:`, err);
    return result;
  }

  traverse(ast, {
    FunctionDeclaration(path: any) {
      const node = path.node;
      result.functions.push({
        name: node.id?.name || 'anonymous',
        startLine: node.loc?.start.line || 0,
        endLine: node.loc?.end.line || 0,
      });
      result.complexity++;
    },
    FunctionExpression(path: any) {
      const node = path.node;
      result.functions.push({
        name: node.id?.name || 'anonymous',
        startLine: node.loc?.start.line || 0,
        endLine: node.loc?.end.line || 0,
      });
      result.complexity++;
    },
    ArrowFunctionExpression(path: any) {
      const node = path.node;
      result.functions.push({
        name: 'arrow',
        startLine: node.loc?.start.line || 0,
        endLine: node.loc?.end.line || 0,
      });
      result.complexity++;
    },
    IfStatement(path: any) {
      const node = path.node;
      result.conditionals.push({ line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    SwitchStatement(path: any) {
      const node = path.node;
      result.conditionals.push({ line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    ForStatement(path: any) {
      const node = path.node;
      result.loops.push({ type: 'for', line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    ForInStatement(path: any) {
      const node = path.node;
      result.loops.push({ type: 'for-in', line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    ForOfStatement(path: any) {
      const node = path.node;
      result.loops.push({ type: 'for-of', line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    WhileStatement(path: any) {
      const node = path.node;
      result.loops.push({ type: 'while', line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    DoWhileStatement(path: any) {
      const node = path.node;
      result.loops.push({ type: 'do-while', line: node.loc?.start.line || 0 });
      result.complexity++;
    },
    TryStatement(path: any) {
      const node = path.node;
      result.tryCatch.push({ line: node.loc?.start.line || 0 });
    },
    CallExpression(path: any) {
      const node = path.node;
      if (node.callee.type === 'Identifier') {
        const callee = node.callee.name;
        if (['fetch', 'axios', 'setTimeout', 'Promise', 'async'].includes(callee)) {
          result.asyncCalls.push({ callee, line: node.loc?.start.line || 0 });
        }
      } else if (node.callee.type === 'MemberExpression') {
        const callee = (node.callee as any).object?.name || '';
        const prop = (node.callee as any).property?.name || '';
        if (['get', 'post', 'put', 'delete'].includes(prop) && callee === 'axios') {
          result.asyncCalls.push({ callee: `axios.${prop}`, line: node.loc?.start.line || 0 });
        }
      }
    },
  });

  return result;
}