import { checkpoints } from "./config.js";
import { print } from "./ui.js";
import fs from "fs";
import path from "path";


if (!fs.existsSync(checkpoints)) {
    fs.mkdirSync(checkpoints, { recursive: true });
}


const existingFiles = fs.readdirSync(checkpoints);
existingFiles.forEach(file => {
    fs.unlinkSync(path.join(checkpoints, file));
});

let checkpoint_id = 0;


function setCheckpoint(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    // Use URL-safe base64 encoding for filenames
    const encoded = Buffer.from(filePath).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    const filename = `${encoded}-${checkpoint_id}`;
    const checkpointPath = path.join(checkpoints, filename);

    fs.writeFileSync(checkpointPath, fs.readFileSync(filePath));
    checkpoint_id++;
    return checkpoint_id - 1;
}


function loadCheckpoint(filePath, targetId) {
    const files = fs.readdirSync(checkpoints);
    let candidates = [];

    for (const file of files) {
        // Split from the right to handle '-' in base64-encoded path
        const lastDashIndex = file.lastIndexOf('-');
        if (lastDashIndex === -1) continue;

        try {
            const encoded = file.substring(0, lastDashIndex);
            const idStr = file.substring(lastDashIndex + 1);
            const id = parseInt(idStr, 10);

            // Decode URL-safe base64
            let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            // Add padding if needed
            while (base64.length % 4) {
                base64 += '=';
            }
            const originalPath = Buffer.from(base64, 'base64').toString();

            // If filePath is null, match by ID only; otherwise match both path and ID
            if (filePath === null) {
                if (!isNaN(id) && id <= targetId) {
                    candidates.push({ id, file, originalPath });
                }
            } else {
                if (originalPath === filePath && !isNaN(id) && id <= targetId) {
                    candidates.push({ id, file, originalPath });
                }
            }
        } catch (e) {

            continue;
        }
    }

    if (candidates.length === 0) {
        const msg = "No checkpoints found";
        print(msg, "red");
        return msg;
    }


    const best = candidates.reduce((max, curr) => (curr.id > max.id ? curr : max), candidates[0]);
    const targetPath = filePath || best.originalPath;

    const checkpointPath = path.join(checkpoints, best.file);
    fs.writeFileSync(targetPath, fs.readFileSync(checkpointPath));
    print(`Loaded checkpoint for file: ${targetPath} (ID: ${best.id})`, "green");
    return true;
}

export { setCheckpoint, loadCheckpoint };