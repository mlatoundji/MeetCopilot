#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walk(dir, base = '') {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'dist'].includes(name)) continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      files.push(...walk(filePath, path.join(base, name)));
    } else if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      files.push({
        file: path.posix.join(base, name).replace(/\\/g, '/'),
        sha: hash,
        size: stat.size
      });
    }
  }
  return files;
}

// Generate inline manifest with base64 file data for Vercel
const filesData = walk(process.cwd()).map(({ file }) => {
  const filePath = path.join(process.cwd(), file);
  const content = fs.readFileSync(filePath);
  return {
    file,
    data: content.toString('base64'),
    encoding: 'base64'
  };
});
console.log(JSON.stringify(filesData, null, 2)); 