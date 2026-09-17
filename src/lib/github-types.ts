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
};
