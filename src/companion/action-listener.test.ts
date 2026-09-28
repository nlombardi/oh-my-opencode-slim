import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  actionFilePath,
  startCompanionActionListener,
} from './action-listener';

const TEST_DIR = path.join(os.tmpdir(), `companion-action-test-${process.pid}`);
const XDG_DIR = path.join(TEST_DIR, 'xdg');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  process.env.XDG_DATA_HOME = XDG_DIR;
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.XDG_DATA_HOME;
});

describe('startCompanionActionListener', () => {
  it('resolves action file path under XDG_DATA_HOME', () => {
    const file = actionFilePath();
    expect(file).toContain('companion-action.json');
    expect(file).toContain(XDG_DIR);
  });

  it('triggers navigation and cleans up file when valid action is written', async () => {
    const navigated: string[] = [];
    const toasts: string[] = [];

    const stop = startCompanionActionListener({
      navigateSession: (id) => navigated.push(id),
      showToast: (msg) => toasts.push(msg),
      intervalMs: 20,
    });

    const file = actionFilePath();
    mkdirSync(path.dirname(file), { recursive: true });

    // Write action file
    const action = {
      action: 'switch_session',
      sessionId: 'ses_abc12345',
      timestamp: Date.now() + 10,
    };
    writeFileSync(file, JSON.stringify(action), 'utf8');

    // Wait for polling loop to process
    await new Promise((resolve) => setTimeout(resolve, 80));

    stop();

    expect(navigated).toEqual(['ses_abc12345']);
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toContain('#c12345');
    expect(existsSync(file)).toBe(false);
  });
});
