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

function focusVSCodeWindow(cwd?: string): void {
  try {
    if (process.platform === 'win32') {
      const vscodePid = process.env.VSCODE_PID;
      const script = vscodePid
        ? `(New-Object -ComObject WScript.Shell).AppActivate(${vscodePid})`
        : `(New-Object -ComObject WScript.Shell).AppActivate('Visual Studio Code')`;
      exec(`powershell -NoProfile -NonInteractive -Command "${script}"`);
      if (cwd) {
        exec(`cmd /c code -r "${cwd}"`);
      }
    } else if (process.platform === 'darwin') {
      exec(
        `osascript -e 'tell application "Visual Studio Code" to activate' 2>/dev/null || osascript -e 'tell application "Code" to activate' 2>/dev/null || true`,
      );
      if (cwd) {
        exec(`code -r "${cwd}" 2>/dev/null || true`);
      }
    } else if (process.platform === 'linux' && !process.env.TMUX) {
      exec(`wmctrl -x -a "code.Code" 2>/dev/null || true`);
      if (cwd) {
        exec(`code -r "${cwd}" 2>/dev/null || true`);
      }
    }
  } catch {}
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

      const targetSessionId =
        action.root_session_id || action.sessionId || action.session_id;

      if (
        action.action === 'switch_session' &&
        action.timestamp > lastProcessedTimestamp &&
        targetSessionId
      ) {
        lastProcessedTimestamp = action.timestamp;

        // 1. Universal OpenCode TUI navigation
        options.navigateSession(targetSessionId);
        options.showToast?.(
          `Switched to session #${targetSessionId.slice(-6)}`,
        );

        // 2. Focus VSCode window
        focusVSCodeWindow(action.cwd);

        // 3. tmux support: switch window / pane if inside tmux
        if (process.env.TMUX) {
          exec(`tmux select-pane -t "${targetSessionId}" 2>/dev/null || true`);
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
