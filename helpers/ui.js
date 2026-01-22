

import { chalk } from '../config.js';
import { highlight } from 'cli-highlight';

export function separator() {
  const width = process.stdout.columns || 80;
  return chalk.dim('─'.repeat(Math.min(width, 80)));
}

export function renderMarkdown(text) {
  
  let result = text;

  
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    try {
      const highlighted = highlight(code.trim(), { language: lang || 'javascript', ignoreIllegals: true });
      return '\n' + highlighted + '\n';
    } catch (e) {
      return match; 
    }
  });

  
  result = result.replace(/`([^`]+)`/g, (match, code) => {
    return chalk.cyan(code);
  });

  
  result = result.replace(/\*\*(.+?)\*\*/g, (match, text) => {
    return chalk.bold(text);
  });

  return result;
}
