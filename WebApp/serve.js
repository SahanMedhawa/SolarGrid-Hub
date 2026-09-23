const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2] || 5500);
const root = __dirname;
const mimeTypes = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

const server = http.createServer((request, response) => {
    const requestedPath = decodeURIComponent(request.url.split('?')[0]);
    const relativePath = requestedPath === '/' ? '/index.html' : requestedPath;
    const filePath = path.resolve(root, `.${relativePath}`);

    if (!filePath.startsWith(root + path.sep)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 500);
            response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
            return;
        }

        response.writeHead(200, {
            'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
        });
        response.end(content);
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`WebApp running at http://localhost:${port}`);
});