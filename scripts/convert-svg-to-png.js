const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.resolve(__dirname, '..', 'public', 'logo-owl.svg');
const pngPath = path.resolve(__dirname, '..', 'public', 'logo-owl.png');

console.log('SVG path:', svgPath);
console.log('PNG path:', pngPath);

const svgContent = fs.readFileSync(svgPath);

sharp(svgContent)
  .resize(200, 200)
  .png()
  .toFile(pngPath)
  .then(() => console.log('PNG created successfully'))
  .catch(err => console.error('Error:', err));
