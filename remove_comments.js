const fs = require('fs');
const path = require('path');
function removeComments(content) {
    content = content.replace(/\/\/.*$/gm, '');
    content = content.replace(/\/\*[\s\S]*?\*\
    content = content.replace(/^\s*$/gm, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content.trim() + '\n';
}
function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && file !== 'node_modules') {
            processDirectory(filePath);
        } else if (file.endsWith('.js')) {
            console.log(`Processing ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf8');
            const cleanedContent = removeComments(content);
            fs.writeFileSync(filePath, cleanedContent);
        }
    }
}
processDirectory('.');
console.log('All comments removed successfully!');
