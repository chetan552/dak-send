import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// SVG is intentionally excluded — an SVG can embed arbitrary JavaScript and
// would be served back with a permissive Content-Type, creating a stored XSS vector.
const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

// Magic-byte signatures for each allowed MIME type.
// Validates actual file content so attackers can't rename a .html to .jpg.
function detectMimeFromBytes(buf: Buffer): string | null {
    if (buf.length < 12) return null;
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return 'image/png';
    // GIF: GIF87a or GIF89a
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
    // WebP: RIFF????WEBP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
    return null;
}

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

        // Validate MIME type declared by client
        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
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

        // Validate actual file content via magic bytes — prevents disguised uploads
        const detectedMime = detectMimeFromBytes(buffer);
        if (!detectedMime || !ALLOWED_TYPES.has(detectedMime)) {
            return NextResponse.json(
                { error: 'File content does not match an allowed image format.' },
                { status: 400 }
            );
        }

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
