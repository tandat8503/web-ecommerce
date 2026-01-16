/**
 * Image placeholder constants
 * Use SVG data URIs to avoid external dependencies
 */

export const NO_IMAGE_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
      <rect width='100%' height='100%' fill='#f5f5f5'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' 
            fill='#999' font-size='24' font-family='Arial, sans-serif'>
        No Image
      </text>
    </svg>
  `);

export const NO_IMAGE_SMALL =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
      <rect width='100%' height='100%' fill='#f5f5f5'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' 
            fill='#999' font-size='18' font-family='Arial, sans-serif'>
        No Image
      </text>
    </svg>
  `);

export const NO_IMAGE_TINY =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
      <rect width='100%' height='100%' fill='#f5f5f5'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' 
            fill='#999' font-size='12' font-family='Arial, sans-serif'>
        No Image
      </text>
    </svg>
  `);

/**
 * Helper to get image source with fallback
 */
export const getImageSrc = (imageUrl, size = 'default') => {
    if (imageUrl && imageUrl.trim() && !imageUrl.includes('via.placeholder')) {
        return imageUrl;
    }

    switch (size) {
        case 'small': return NO_IMAGE_SMALL;
        case 'tiny': return NO_IMAGE_TINY;
        default: return NO_IMAGE_PLACEHOLDER;
    }
};

/**
 * onError handler để xử lý ảnh lỗi
 */
export const handleImageError = (e, size = 'default') => {
    if (e.currentTarget.dataset.errorHandled) return; // Prevent loop
    e.currentTarget.dataset.errorHandled = 'true';
    e.currentTarget.src = getImageSrc(null, size);
};
