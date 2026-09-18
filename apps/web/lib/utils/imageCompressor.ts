/**
 * Automatically resizes and compresses uploaded employee photos and logos.
 * Converts large high-res camera photos (e.g. 5MB) into optimized JPEGs (~80KB - 150KB)
 * for high-density 300 DPI CR80 ID printing without wasting storage space.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve) => {
    // If not an image or already under 120KB, pass through directly
    if (!file.type.startsWith('image/') || file.size <= 120 * 1024) {
      return resolve(file);
    }

    // In non-browser environments, return original file
    if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while bounding within maxWidth / maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Smooth high quality downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);

            const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg';
            const compressedFile = new File([blob], compressedFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
