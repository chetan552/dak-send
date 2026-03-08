import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readdir, stat, unlink } from 'fs/promises';
import { join, extname } from 'path';

function getUploadsDir() {
    return join(process.cwd(), 'uploads');
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

// GET /api/uploads — list all uploaded images
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const uploadsDir = getUploadsDir();

        let files: string[] = [];
        try {
            files = await readdir(uploadsDir);
        } catch {
            // Directory doesn't exist yet
            return NextResponse.json({ images: [] });
        }

        const images = [];
        for (const filename of files) {
            const ext = extname(filename).toLowerCase();
            if (!IMAGE_EXTENSIONS.has(ext)) continue;

            const filePath = join(uploadsDir, filename);
            try {
                const fileStat = await stat(filePath);
                const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
                images.push({
                    filename,
                    url: `${appUrl}/api/uploads/${filename}`,
                    size: fileStat.size,
                    createdAt: fileStat.birthtime.toISOString(),
                    modifiedAt: fileStat.mtime.toISOString(),
                });
            } catch {
                // Skip files we can't stat
            }
        }

        // Sort newest first
        images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error listing uploads:', error);
        return NextResponse.json({ error: 'Failed to list uploads' }, { status: 500 });
    }
}

// DELETE /api/uploads?filename=xxx — delete an uploaded image
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        // Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const filePath = join(getUploadsDir(), filename);

        try {
            await stat(filePath);
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        await unlink(filePath);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting upload:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
