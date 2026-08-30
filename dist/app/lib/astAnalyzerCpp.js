"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCodeAST = analyzeCodeAST;
// @ts-nocheck – disable all TypeScript checking for this file
const { Parser, Language } = require('web-tree-sitter');
// Use the official tree-sitter C++ WASM from CDN
const WASM_URL = 'https://cdn.jsdelivr.net/npm/tree-sitter-cpp@0.23.4/wasm/tree-sitter-cpp.wasm';
let parser = null;
async function getParser() {
    if (!parser) {
        await Parser.init();
        // Fetch WASM from CDN as buffer
        const response = await fetch(WASM_URL);
        if (!response.ok)
            throw new Error(`Failed to fetch WASM: ${response.statusText}`);
        const wasmBuffer = await response.arrayBuffer();
        const lang = await Language.loadFromBuffer(wasmBuffer);
        parser = new Parser();
        parser.setLanguage(lang);
    }
    return parser;
}
async function analyzeCodeAST(code) {
    const parser = await getParser();
    const tree = parser.parse(code);
    if (!tree)
        throw new Error('Failed to parse code');
    const result = {
        functions: [],
        classes: [],
        conditionals: [],
        loops: [],
        tryCatch: [],
        complexity: 0,
    };
    function traverse(node) {
        if (node.type === 'function_definition') {
            const declarator = node.childForFieldName('declarator');
            if (declarator) {
                const nameNode = declarator.childForFieldName('declarator');
                const name = nameNode ? nameNode.text : 'anonymous';
                result.functions.push({
                    name,
                    startLine: node.startPosition.row + 1,
                    endLine: node.endPosition.row + 1,
                });
                result.complexity++;
            }
        }
        else if (node.type === 'class_specifier' || node.type === 'struct_specifier') {
            const nameNode = node.childForFieldName('name');
            const name = nameNode ? nameNode.text : 'anonymous';
            result.classes.push({
                name,
                startLine: node.startPosition.row + 1,
                endLine: node.endPosition.row + 1,
            });
            result.complexity++;
        }
        else if (node.type === 'if_statement') {
            result.conditionals.push({ line: node.startPosition.row + 1 });
            result.complexity++;
        }
        else if (node.type === 'for_statement' || node.type === 'while_statement') {
            result.loops.push({ type: node.type, line: node.startPosition.row + 1 });
            result.complexity++;
        }
        else if (node.type === 'try_statement') {
            result.tryCatch.push({ line: node.startPosition.row + 1 });
        }
        for (let i = 0; i < node.childCount; i++) {
            traverse(node.child(i));
        }
    }
    traverse(tree.rootNode);
    return result;
}
