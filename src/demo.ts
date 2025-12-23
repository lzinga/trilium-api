/**
 * Demo script to test connecting to a local Trilium instance
 *
 * Usage:
 *   pnpm tsx src/demo.ts
 *
 * Make sure to set your ETAPI token below or via environment variable:
 *   TRILIUM_API_KEY=your-token pnpm tsx src/demo.ts
 */

import { createTriliumClient, type TriliumNote } from './client.js';

const TRILIUM_URL = process.env.TRILIUM_URL || 'http://localhost:8080';
const TRILIUM_API_KEY = process.env.TRILIUM_API_KEY || 'YOUR_ETAPI_TOKEN_HERE';
const MAX_DEPTH = parseInt(process.env.MAX_DEPTH || '3', 10);

type Client = ReturnType<typeof createTriliumClient>;

async function printNoteTree(
    client: Client,
    noteId: string,
    depth: number = 0,
    prefix: string = '',
    isLast: boolean = true
): Promise<void> {
    if (depth > MAX_DEPTH) {
        console.log(`${prefix}${isLast ? '└── ' : '├── '}...`);
        return;
    }

    const { data: note, error } = await client.GET('/notes/{noteId}', {
        params: { path: { noteId } },
    });

    if (error || !note) {
        console.log(`${prefix}${isLast ? '└── ' : '├── '}[Error fetching note]`);
        return;
    }

    const icon = getTypeIcon(note.type);
    const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
    console.log(`${prefix}${connector}${icon} ${note.title || '(untitled)'}`);

    const childIds = note.childNoteIds || [];
    if (childIds.length === 0) return;

    const newPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

    for (let i = 0; i < childIds.length; i++) {
        const childId = childIds[i];
        if (!childId) continue;
        const isLastChild = i === childIds.length - 1;
        await printNoteTree(client, childId, depth + 1, newPrefix, isLastChild);
    }
}

function getTypeIcon(type: TriliumNote['type']): string {
    switch (type) {
        case 'text':
            return '📄';
        case 'code':
            return '💻';
        case 'image':
            return '🖼️';
        case 'search':
            return '🔍';
        case 'book':
            return '📚';
        case 'noteMap':
            return '🗺️';
        case 'mermaid':
            return '📊';
        case 'webView':
            return '🌐';
        case 'launcher':
            return '🚀';
        case 'doc':
            return '📝';
        case 'contentWidget':
            return '🧩';
        case 'relationMap':
            return '🔗';
        case 'render':
            return '⚡';
        case 'file':
            return '📎';
        default:
            return '📁';
    }
}

async function main() {
    console.log('🔌 Connecting to Trilium at:', TRILIUM_URL);
    console.log();

    const client = createTriliumClient({
        baseUrl: TRILIUM_URL,
        apiKey: TRILIUM_API_KEY,
    });

    // Get app info
    const { data: appInfo, error: appError } = await client.GET('/app-info');

    if (appError) {
        console.error('❌ Failed to connect:', appError);
        console.error('\nMake sure:');
        console.error('  1. Trilium is running at', TRILIUM_URL);
        console.error('  2. Your ETAPI token is correct');
        console.error('  3. ETAPI is enabled in Trilium settings');
        process.exit(1);
    }

    console.log('✅ Connected to Trilium', appInfo?.appVersion);
    console.log();

    // Print tree view
    console.log(`📂 Note Tree (max depth: ${MAX_DEPTH}):`);
    console.log('─'.repeat(40));
    await printNoteTree(client, 'root');
    console.log('─'.repeat(40));

    console.log();
    console.log('🎉 Done! Set MAX_DEPTH env var to see more levels.');
}

main().catch(console.error);
