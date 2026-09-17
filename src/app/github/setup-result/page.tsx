import Link from "next/link";
import {
  SETUP_STATUS,
  isSetupStatusKey,
} from "@/lib/github-setup-messages";

export const dynamic = "force-dynamic";

export default async function GithubSetupResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message = isSetupStatusKey(status) ? SETUP_STATUS[status] : SETUP_STATUS.signIn;

  return (
    <main id="main" className="mx-auto flex min-h-0 flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-lg font-medium">{message.title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message.body}</p>
      <Link className="text-sm font-medium underline underline-offset-2" href="/">
        Return to GitHub Stars
      </Link>
    </main>
  );
}
