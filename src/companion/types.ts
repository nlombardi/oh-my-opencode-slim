export interface CompanionAgentTask {
  sessionId: string;
  parentSessionId?: string;
  agent: string;
  alias?: string;
  title?: string;
  model?: string;
  startedAt: number;
  sessionColorIndex: number;
  session_id?: string;
  parent_session_id?: string;
  started_at?: number;
  session_color_index?: number;
}

export interface CompanionSessionEntry {
  session_id: string;
  cwd: string;
  active_agents: string[]; // Preserved for backwards compatibility
  agent_tasks?: CompanionAgentTask[]; // Rich structured metadata
  status: string;
  pid: number;
  config?: Record<string, unknown>;
}

export interface CompanionAction {
  action: 'switch_session';
  sessionId: string;
  timestamp: number;
}
