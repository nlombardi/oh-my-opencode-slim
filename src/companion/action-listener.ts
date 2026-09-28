import { exec } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { CompanionAction } from './types';

export function actionFilePath(): string {
  const xdg = process.env.XDG_DATA_HOME?.trim();
  const base =
    xdg && path.isAbsolute(xdg)
      ? xdg
      : path.join(os.homedir(), '.local', 'share');
  return path.join(
    base,
    'opencode',
    'storage',
    'oh-my-opencode-slim',
    'companion-action.json',
  );
}

export function startCompanionActionListener(options: {
  navigateSession: (sessionId: string) => void;
  showToast?: (message: string) => void;
  intervalMs?: number;
}): () => void {
  const file = actionFilePath();
  let lastProcessedTimestamp = Date.now();

  const checkAction = () => {
    if (!existsSync(file)) return;
    try {
      const content = readFileSync(file, 'utf8');
      const action = JSON.parse(content) as CompanionAction;

      if (
        action.action === 'switch_session' &&
        action.timestamp > lastProcessedTimestamp &&
        action.sessionId
      ) {
        lastProcessedTimestamp = action.timestamp;

        // 1. Universal OpenCode TUI navigation
        options.navigateSession(action.sessionId);
        options.showToast?.(
          `Switched to session #${action.sessionId.slice(-6)}`,
        );

        // 2. tmux support: switch window / pane if inside tmux
        if (process.env.TMUX) {
          exec(`tmux select-pane -t "${action.sessionId}" 2>/dev/null || true`);
        }

        // Clean up action file
        try {
          unlinkSync(file);
        } catch {}
      }
    } catch {}
  };

  const timer = setInterval(checkAction, options.intervalMs ?? 150);
  return () => clearInterval(timer);
}
