# LucidityAI Agent

A coding agent intended for LucidityAI models, providing a terminal-based interface for AI-assisted coding tasks.

## Description

This project is a CLI tool that leverages LucidityAI models to assist with coding tasks. It can execute commands, edit files, read code, and interact with users through a terminal interface. The agent uses a modular architecture with tools for file operations, bash execution, and user interaction.

## Configuration

On first run, a configuration file `lc_config/config.json` will be created in the project root with default settings:

```json
{
  "api_key": "",
  "model": "astral-coder",
  "api_base": "https://api.lucidityai.app/v1",
  "actions": "auto-accept"
}
```

- `api_key`: Your API key
- `model`: The AI model to use
- `api_base`: Base URL for the API
- `actions`: Set to "auto-accept" for automatic tool execution or "ask" to ask the user before executing tools

## Features

- **Terminal-based Interface**: Interactive CLI with colored output and progress indicators
- **Tool Execution**: Supports various tools including:
  - File operations (create, edit, delete, read)
  - Directory listing and creation
  - Bash command execution
  - Diff/patch application
  - User questioning for clarification
- **Context Management**: Automatic compression of long conversations to stay within context limits
- **Configurable Settings**: Customize API endpoints, models, and execution behavior
- **Streaming Responses**: Real-time streaming of AI responses for better user experience
- **Error Handling**: Robust error handling with retry mechanisms

> Bulit with ❤️ by [LucidityAI](https://lucidityai.app)