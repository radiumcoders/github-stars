export const SETUP_STATUS = {
  unavailable: {
    title: "GitHub connection is unavailable",
    body: "The service owner needs to finish configuration.",
  },
  approval: {
    title: "Installation is waiting for approval",
    body: "An administrator still needs to approve this GitHub App for the organization. Return after it is approved and refresh the repository list.",
  },
  notConnected: {
    title: "Repository access was not connected",
    body: "That installation is not available to the signed-in GitHub account. Sign in with the account that installed the app, or connect repositories again.",
  },
  connect: {
    title: "Connect repositories",
    body: "Sign in first, then choose repositories from this app. The installation return did not include a valid session-bound state.",
  },
  signIn: {
    title: "Sign in to finish connecting",
    body: "Install return is not enough by itself. Sign in with GitHub, then connect repositories from the app.",
  },
} as const;

export type SetupStatusKey = keyof typeof SETUP_STATUS;

export function isSetupStatusKey(value: string | null | undefined): value is SetupStatusKey {
  return typeof value === "string" && Object.hasOwn(SETUP_STATUS, value);
}
