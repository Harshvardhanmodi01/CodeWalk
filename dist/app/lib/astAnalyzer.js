"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCodeAST = analyzeCodeAST;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
function analyzeCodeAST(code, filename) {
    const result = {
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
    }
    catch (err) {
        console.warn(`AST parsing failed for ${filename}:`, err);
        return result;
    }
    (0, traverse_1.default)(ast, {
        FunctionDeclaration(path) {
            const node = path.node;
            result.functions.push({
                name: node.id?.name || 'anonymous',
                startLine: node.loc?.start.line || 0,
                endLine: node.loc?.end.line || 0,
            });
            result.complexity++;
        },
        FunctionExpression(path) {
            const node = path.node;
            result.functions.push({
                name: node.id?.name || 'anonymous',
                startLine: node.loc?.start.line || 0,
                endLine: node.loc?.end.line || 0,
            });
            result.complexity++;
        },
        ArrowFunctionExpression(path) {
            const node = path.node;
            result.functions.push({
                name: 'arrow',
                startLine: node.loc?.start.line || 0,
                endLine: node.loc?.end.line || 0,
            });
            result.complexity++;
        },
        IfStatement(path) {
            const node = path.node;
            result.conditionals.push({ line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        SwitchStatement(path) {
            const node = path.node;
            result.conditionals.push({ line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        ForStatement(path) {
            const node = path.node;
            result.loops.push({ type: 'for', line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        ForInStatement(path) {
            const node = path.node;
            result.loops.push({ type: 'for-in', line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        ForOfStatement(path) {
            const node = path.node;
            result.loops.push({ type: 'for-of', line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        WhileStatement(path) {
            const node = path.node;
            result.loops.push({ type: 'while', line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        DoWhileStatement(path) {
            const node = path.node;
            result.loops.push({ type: 'do-while', line: node.loc?.start.line || 0 });
            result.complexity++;
        },
        TryStatement(path) {
            const node = path.node;
            result.tryCatch.push({ line: node.loc?.start.line || 0 });
        },
        CallExpression(path) {
            const node = path.node;
            if (node.callee.type === 'Identifier') {
                const callee = node.callee.name;
                if (['fetch', 'axios', 'setTimeout', 'Promise', 'async'].includes(callee)) {
                    result.asyncCalls.push({ callee, line: node.loc?.start.line || 0 });
                }
            }
            else if (node.callee.type === 'MemberExpression') {
                const callee = node.callee.object?.name || '';
                const prop = node.callee.property?.name || '';
                if (['get', 'post', 'put', 'delete'].includes(prop) && callee === 'axios') {
                    result.asyncCalls.push({ callee: `axios.${prop}`, line: node.loc?.start.line || 0 });
                }
            }
        },
    });
    return result;
}
