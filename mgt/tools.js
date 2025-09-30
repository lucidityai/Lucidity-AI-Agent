import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function createFile(file_path, content) {
    try {
        
        const normalizedPath = path.normalize(file_path);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal detected');
        }

        
        const dir = path.dirname(normalizedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(normalizedPath, content || '');
        return fs.readFileSync(normalizedPath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to create file ${file_path}: ${error.message}`);
    }
}

function createDir(dir_path) {
    try {
        
        const normalizedPath = path.normalize(dir_path);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal detected');
        }

        fs.mkdirSync(normalizedPath, { recursive: true });
        return fs.readdirSync(normalizedPath);
    } catch (error) {
        throw new Error(`Failed to create directory ${dir_path}: ${error.message}`);
    }
}

function listDirectory(directory) {
    try {
        
        const normalizedPath = path.normalize(directory);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal detected');
        }

        
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`Directory does not exist: ${directory}`);
        }

        const stats = fs.statSync(normalizedPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${directory}`);
        }

        return fs.readdirSync(normalizedPath);
    } catch (error) {
        throw new Error(`Failed to list directory ${directory}: ${error.message}`);
    }
}

function deleteFile(file_path) {
    try {
        
        const normalizedPath = path.normalize(file_path);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal detected');
        }

        
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`File does not exist: ${file_path}`);
        }

        const stats = fs.statSync(normalizedPath);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${file_path}`);
        }

        fs.unlinkSync(normalizedPath);
        return fs.readdirSync(path.dirname(normalizedPath));
    } catch (error) {
        throw new Error(`Failed to delete file ${file_path}: ${error.message}`);
    }
}

function findReplace(file_path, find_text, replace_text) {
    try {
        
        const normalizedPath = path.normalize(file_path);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal detected');
        }

        
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`File does not exist: ${file_path}`);
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');

        
        if (!content.includes(find_text)) {
            throw new Error('Find text not found in file');
        }

        
        const result = content.replaceAll(find_text, replace_text);

        fs.writeFileSync(normalizedPath, result);
        return fs.readFileSync(normalizedPath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to find and replace in file ${file_path}: ${error.message}`);
    }
}

function readFile(file_path, start, end) {
    try {
        
        const normalizedPath = path.normalize(file_path);
        if (normalizedPath.includes('..')) {
            throw new Error('Path traversal detected');
        }

        
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`File does not exist: ${file_path}`);
        }

        const stats = fs.statSync(normalizedPath);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${file_path}`);
        }

        const content = fs.readFileSync(normalizedPath, 'utf-8');

        
        if (start === -1 && end === -1) {
            return content;
        }

        const safeStart = Math.max(0, start || 0);
        const safeEnd = end === -1 ? content.length : Math.min(content.length, end || content.length);

        return content.slice(safeStart, safeEnd);
    } catch (error) {
        throw new Error(`Failed to read file ${file_path}: ${error.message}`);
    }
}

function bash(command) {
    try {
        return execSync(command, {
            timeout: 30000, 
            maxBuffer: 1024 * 1024, 
        }).toString();
    } catch (error) {
        if (error.code === 'ETIMEDOUT') {
            throw new Error('Command timed out after 30 seconds');
        }
        throw new Error(`Command failed: ${error.message}`);
    }
}

let tool_list = [
    { name: 'create', func: createFile },
    { name: 'create_dir', func: createDir },
    { name: 'listDirectory', func: listDirectory },
    { name: 'delete', func: deleteFile },
    { name: 'findReplace', func: findReplace },
    { name: 'read', func: readFile },
    { name: 'bash', func: bash },
];

export { createFile, createDir, deleteFile, findReplace, readFile, bash, tool_list };