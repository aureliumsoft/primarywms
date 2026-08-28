import { prisma } from "@/lib/db";
import { APP_NAME, DEFAULT_ACCENT } from "@primarywms/shared";
import { notFound } from "next/navigation";

export const metadata = { title: `Shared file · ${APP_NAME}` };

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const file = await prisma.sharedFile.findUnique({ where: { shareToken: token } });
  if (!file) notFound();
  const src = file.publicUrl || `/api/v1/share/${token}?download=1`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-white px-6 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: DEFAULT_ACCENT }}
        >
          PW
        </div>
        <div>
          <div className="text-sm font-semibold">{APP_NAME}</div>
          <div className="text-xs text-muted-foreground">Shared file</div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="truncate text-lg font-semibold">{file.name}</h1>
          <a
            href={src}
            download={file.name}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase text-white"
          >
            Download
          </a>
        </div>
        <div className="flex-1 overflow-hidden rounded-2xl bg-white shadow-sm">
          {file.kind === "image" ? (
            <img src={src} alt={file.name} className="mx-auto max-h-[80vh] w-full object-contain" />
          ) : (
            <iframe title={file.name} src={src} className="h-[80vh] w-full border-0" />
          )}
        </div>
      </main>
    </div>
  );
}
