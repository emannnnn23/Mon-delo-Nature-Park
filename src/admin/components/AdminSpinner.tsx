import { LoaderCircle } from "lucide-react";

/** Centred spinner shown while an admin route's clientLoader runs. */
export function AdminSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory-50">
      <div role="status" aria-label="Loading the admin" className="p-4">
        <LoaderCircle
          aria-hidden="true"
          className="size-8 animate-spin text-forest-900 motion-reduce:animate-none"
        />
      </div>
    </div>
  );
}
