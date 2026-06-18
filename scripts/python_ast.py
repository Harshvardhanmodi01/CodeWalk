import sys
import ast
import json

def extract_ast_info(code):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"Syntax error: {e}"}
    
    functions = []
    conditionals = []
    loops = []
    try_catch = []
    async_calls = []
    complexity = 0

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            functions.append({
                "name": node.name,
                "startLine": node.lineno,
                "endLine": node.end_lineno
            })
            complexity += 1
        elif isinstance(node, ast.If):
            conditionals.append({"line": node.lineno})
            complexity += 1
        elif isinstance(node, (ast.For, ast.While)):
            loops.append({"type": "for/while", "line": node.lineno})
            complexity += 1
        elif isinstance(node, ast.Try):
            try_catch.append({"line": node.lineno})
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in ['fetch', 'requests.get', 'asyncio']:
                async_calls.append({"callee": node.func.id, "line": node.lineno})

    return {
        "functions": functions,
        "conditionals": conditionals,
        "loops": loops,
        "tryCatch": try_catch,
        "asyncCalls": async_calls,
        "complexity": complexity
    }

if __name__ == "__main__":
    code = sys.stdin.read()
    result = extract_ast_info(code)
    print(json.dumps(result))