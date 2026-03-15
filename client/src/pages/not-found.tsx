import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#050505" }}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-8">
        <div className="flex mb-4 gap-3 items-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <h1 className="text-2xl font-bold text-white">404 Page Not Found</h1>
        </div>
        <p className="mt-4 text-sm text-white/30">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
