import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
]);

function getUploadsDir() {
    // Use a persistent directory outside public/ so it survives standalone builds
    return join(process.cwd(), 'uploads');
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure the uploads directory exists
        const uploadsDir = getUploadsDir();
        await mkdir(uploadsDir, { recursive: true });

        // Generate a unique filename using cryptographically secure random bytes
        const uniqueSuffix = randomBytes(16).toString("hex");
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, ''); // Sanitize filename
        const filename = `${uniqueSuffix}-${originalName}`;
        const filePath = join(uploadsDir, filename);

        await writeFile(filePath, buffer);

        // Construct URL via the serve route
        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
        const publicUrl = `${appUrl}/api/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
