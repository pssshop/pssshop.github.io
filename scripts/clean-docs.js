const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');
const keepFiles = ['inventory.json'];

if (!fs.existsSync(docsDir)) {
  process.exit(0);
}

fs.readdirSync(docsDir).forEach(file => {
  if (!keepFiles.includes(file)) {
    const filePath = path.join(docsDir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
});
