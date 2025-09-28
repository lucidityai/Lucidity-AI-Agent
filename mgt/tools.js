import fs from 'fs';
import path from 'path';
import { diffChars, createPatch } from 'diff';
import { execSync } from 'child_process';

function createFile(file_path) {
    fs.writeFileSync(file_path, '');
    return fs.readFileSync(file_path, 'utf-8');
}

function createDir(dir_path) {
    fs.mkdirSync(dir_path, { recursive: true });
    return fs.readdirSync(dir_path);
}

function listDirectory(directory) {
    return fs.readdirSync(directory);
}

function deleteFile(file_path) {
    fs.unlinkSync(file_path);
    return fs.readdirSync(path.dirname(file_path));
}

function applyDiff(file_path, diff) {
    const content = fs.readFileSync(file_path, 'utf-8');
    const patch = createPatch(file_path, content, diff);
    fs.writeFileSync(file_path, patch);
    return fs.readFileSync(file_path, 'utf-8');
}

function readFile(file_path, start, end) {
    const content = fs.readFileSync(file_path, 'utf-8');
    return content.slice(start, end);
}

function bash(command) {
    return execSync(command).toString();
}

let tool_list = [
    { name: 'create', func: createFile },
    { name: 'create_dir', func: createDir },
    { name: 'delete', func: deleteFile },
    { name: 'diff', func: applyDiff },
    { name: 'read', func: readFile },
    { name: 'bash', func: bash },
];

export { createFile, createDir, deleteFile, applyDiff, readFile, bash, tool_list };