import { createFileRoute, Link } from "@tanstack/react-router";
import { FileQuestion, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/$")({
  component: AdminNotFound,
});

function AdminNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-8">
      <div className="lp-card-elevated max-w-md p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <FileQuestion className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-primary">
          Rota do admin não encontrada
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          A URL que você tentou abrir não existe dentro do painel. Talvez tenha sido removida ou o
          link esteja quebrado.
        </p>
        <Link to="/admin" className="lp-btn-primary-indigo mt-6 inline-flex">
          <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
