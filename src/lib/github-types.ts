export type ConnectedRepository = {
  id: number;
  fullName: string;
  private: boolean;
  installationId: number;
};

export type ConnectionStatus = {
  configured: boolean;
  connected: boolean;
  pending: boolean;
  appSlug: string | null;
  installUrl: string | null;
  manageUrl: string | null;
  repositoryCount: number;
  repositories: ConnectedRepository[];
  allowManualRepository: boolean;
  issues: string[];
};

export function connectionStatus(overrides: Partial<ConnectionStatus> = {}): ConnectionStatus {
  return {
    configured: false,
    connected: false,
    pending: false,
    appSlug: null,
    installUrl: null,
    manageUrl: null,
    repositoryCount: 0,
    repositories: [],
    allowManualRepository: false,
    issues: [],
    ...overrides,
  };
}
