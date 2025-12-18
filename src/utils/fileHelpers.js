
// Convert file to Base 64
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

export const validateFile = (file, type) => {
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB (Chunk Strategy handles this)

    if (type === 'image') {
        if (file.size > MAX_IMAGE_SIZE) return { valid: false, error: 'Image too large (Max 2MB)' };
        if (file.type !== 'image/webp') return { valid: false, error: 'Invalid format (WebP ONLY)' };
    }
    if (type === 'pdf') {
        if (file.size > MAX_PDF_SIZE) return { valid: false, error: 'PDF too large (Max 5MB)' };
        if (file.type !== 'application/pdf') return { valid: false, error: 'Invalid format (PDF only)' };
    }
    return { valid: true };
};

export const extractDriveId = (url) => {
    if (!url) return null;
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
};

export const formatDriveLink = (url) => {
    const id = extractDriveId(url);
    if (!id) return url;
    return `https://drive.google.com/uc?export=download&id=${id}`;
};
