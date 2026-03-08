import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
};

function getUploadsDir() {
    return join(process.cwd(), 'uploads');
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filename = path.join('/');

        // Prevent directory traversal
        if (filename.includes('..') || filename.startsWith('/')) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        const filePath = join(getUploadsDir(), filename);

        // Check file exists
        try {
            await stat(filePath);
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const ext = extname(filename).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
    }
}
