const fs = require('fs');
const path = require('path');

/**
 * Recursively copy files with specific extensions
 */
function copyFilesWithExtensions(srcDir, destDir, extensions) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      copyFilesWithExtensions(srcPath, destPath, extensions);
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${srcPath} -> ${destPath}`);
      }
    }
  }
}

// Copy HTML and CSS files from renderer
copyFilesWithExtensions('src/renderer', 'dist/renderer', ['.html', '.css']);

// Copy assets folder
const assetsDir = 'dist/assets';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (fs.existsSync('src/assets')) {
  const assets = fs.readdirSync('src/assets');
  for (const asset of assets) {
    fs.copyFileSync(
      path.join('src/assets', asset),
      path.join(assetsDir, asset)
    );
    console.log(`Copied: src/assets/${asset} -> ${assetsDir}/${asset}`);
  }
}

console.log('Asset copy complete!');
