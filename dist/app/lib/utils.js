"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartTruncate = smartTruncate;
exports.getFilePriority = getFilePriority;
exports.extractLineNumber = extractLineNumber;
exports.formatDuration = formatDuration;
/**
 * Smart truncation that keeps the most informative parts of a code file.
 * - <=600 lines: full file
 * - 600-2000: 40% top + 20% middle + 40% bottom (600 lines kept)
 * - >2000: 50% top + 50% bottom (800 lines kept)
 */
function smartTruncate(code, maxLines = 600) {
    const lines = code.split('\n');
    const originalLines = lines.length;
    if (originalLines <= maxLines) {
        return {
            truncatedCode: code,
            originalLines,
            keptLines: originalLines,
            percentageKept: 100,
            strategy: 'full',
        };
    }
    let result = [];
    let strategy;
    let keptLines;
    if (originalLines <= 2000) {
        // 40% top + 20% middle + 40% bottom = 600 lines
        const topCount = Math.floor(600 * 0.4);
        const midCount = Math.floor(600 * 0.2);
        const botCount = 600 - topCount - midCount;
        const top = lines.slice(0, topCount);
        const midStart = Math.floor((originalLines - midCount) / 2);
        const middle = lines.slice(midStart, midStart + midCount);
        const bottom = lines.slice(originalLines - botCount);
        const skipBeforeMid = midStart - topCount;
        const skipAfterMid = originalLines - botCount - (midStart + midCount);
        result = [
            ...top,
            `// ... [${skipBeforeMid} lines truncated] ...`,
            ...middle,
            `// ... [${skipAfterMid} lines truncated] ...`,
            ...bottom,
        ];
        strategy = 'top-middle-bottom';
        keptLines = 600;
    }
    else {
        // 50% top + 50% bottom = 800 lines
        const half = 400;
        const top = lines.slice(0, half);
        const bottom = lines.slice(originalLines - half);
        const skipped = originalLines - 800;
        result = [
            ...top,
            `// ... [${skipped} lines truncated] ...`,
            ...bottom,
        ];
        strategy = 'top-bottom';
        keptLines = 800;
    }
    const truncatedCode = result.join('\n');
    const percentageKept = Math.round((keptLines / originalLines) * 100);
    return {
        truncatedCode,
        originalLines,
        keptLines,
        percentageKept,
        strategy,
    };
}
/**
 * Assign a priority rank for a filename — lower is more important.
 * 0: entry points, 1: utils/api/services, 2: components/views,
 * 3: config/tests/types, 4: everything else
 */
function getFilePriority(filename) {
    const lower = filename.toLowerCase();
    const base = lower.split('/').pop() || lower;
    const nameOnly = base.replace(/\.[^.]+$/, '');
    const tier0 = ['index', 'main', 'app', 'server', 'core'];
    const tier1 = ['utils', 'helpers', 'api', 'services', 'controllers', 'models', 'helper', 'service', 'controller', 'model'];
    const tier2 = ['components', 'views', 'pages', 'routes', 'component', 'view', 'page', 'route'];
    const tier3 = ['config', 'tests', 'docs', 'types', 'constants', 'test', 'doc', 'type', 'constant'];
    if (tier0.includes(nameOnly))
        return 0;
    for (const word of tier1) {
        if (lower.includes(`/${word}/`) || nameOnly.includes(word))
            return 1;
    }
    for (const word of tier2) {
        if (lower.includes(`/${word}/`) || nameOnly.includes(word))
            return 2;
    }
    for (const word of tier3) {
        if (lower.includes(`/${word}/`) || nameOnly.includes(word))
            return 3;
    }
    return 4;
}
/**
 * Extract the first line number found in a string.
 * Tries [Line N], line N, LN, #LN.
 */
function extractLineNumber(text) {
    if (!text)
        return null;
    const patterns = [
        /\[Line\s*(\d+)\]/i,
        /line\s*(\d+)/i,
        /L(\d+)/i,
        /#L(\d+)/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const n = parseInt(match[1], 10);
            if (!Number.isNaN(n))
                return n;
        }
    }
    return null;
}
/**
 * Format a duration in milliseconds for display.
 */
function formatDuration(ms) {
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
}
