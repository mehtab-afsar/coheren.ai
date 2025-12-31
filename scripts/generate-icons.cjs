const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="black"/>
  <text x="256" y="350" font-family="Arial, sans-serif" font-size="320" font-weight="bold" fill="white" text-anchor="middle">C</text>
</svg>
`;

const publicDir = path.join(__dirname, '../public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateIcons() {
  try {
    const svgBuffer = Buffer.from(svgIcon);

    // Generate 192x192
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));

    console.log('✓ Generated icon-192.png');

    // Generate 512x512
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));

    console.log('✓ Generated icon-512.png');

    // Generate favicon (32x32)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));

    console.log('✓ Generated favicon.png');

    console.log('\nAll PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
