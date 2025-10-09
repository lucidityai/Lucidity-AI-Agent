import * as fs from 'fs';
import * as path from 'path';

const configPath = path.join(process.cwd(), '.lc_config', 'config.json');

const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

let api_key, api_base, model, actions, checkpoints;

function validateConfig(config) {
    const errors = [];

    if (typeof config !== 'object' || config === null) {
        errors.push('Config must be a valid JSON object');
        return errors;
    }

    if (!config.api_key || typeof config.api_key !== 'string') {
        errors.push('API key is required and must be a non-empty string');
    }

    if (!config.model || typeof config.model !== 'string') {
        errors.push('Model is required and must be a non-empty string');
    }

    if (!config.api_base || typeof config.api_base !== 'string') {
        errors.push('API base URL is required and must be a non-empty string');
    } else {
        try {
            new URL(config.api_base);
        } catch {
            errors.push('API base URL must be a valid URL');
        }
    }

    if (!config.checkpoints || typeof config.checkpoints !== 'string') {
        errors.push('Checkpoints directory is required and must be a non-empty string');
    }

    const validActions = ['auto-accept', 'ask'];
    if (!config.actions || !validActions.includes(config.actions)) {
        errors.push(`Actions must be one of: ${validActions.join(', ')}`);
    }

    return errors;
}

function loadConfig() {
    try {
        let config;

        if (!fs.existsSync(configPath)) {
            const defaultConfig = {
                "api_key": "",
                "model": "",
                "api_base": "",
                "actions": "auto-accept",
                "checkpoints": ".lc_checkpoints"
            };

            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            config = defaultConfig;

            console.warn('Created default config file. Please update .lc_config/config.json with your API key.');
        } else {
            const configData = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(configData);
        }

        const validationErrors = validateConfig(config);
        if (validationErrors.length > 0) {
            console.error('Configuration validation errors:');
            validationErrors.forEach(error => console.error(`  - ${error}`));
            process.exit(1);
        }

        return config;
    } catch (error) {
        console.error(`Failed to load configuration: ${error.message}`);
        process.exit(1);
    }
}

const config = loadConfig();
api_key = config.api_key;
api_base = config.api_base;
model = config.model;
actions = config.actions;
checkpoints = config.checkpoints;

export { api_key, api_base, model, actions, checkpoints };