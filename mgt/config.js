import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(import.meta.dirname, '..', 'lc_config', 'config.json');

// ensure the config directory exists
const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

let api_key, api_base, model, actions;

if (!fs.existsSync(configPath)) {
    // assume this is the first run and create the config file
    fs.writeFileSync(configPath, JSON.stringify({
        "api_key": "",
        "model": "astral-coder",
        "api_base": "https://api.lucidityai.app/v1",
        "actions": "auto-accept",
    }, null, 2));

    // load the config file
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    api_key = config.api_key;
    api_base = config.api_base;
    model = config.model;
    actions = config.actions;
} else {
    // load the config file
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    api_key = config.api_key;
    api_base = config.api_base;
    model = config.model;
    actions = config.actions;
}

export { api_key, api_base, model, actions };