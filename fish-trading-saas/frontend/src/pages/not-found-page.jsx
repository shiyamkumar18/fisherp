import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="max-w-md text-center">
        <h2 className="text-2xl">Page not found</h2>
        <p className="mt-2 text-slate-600">The route you requested does not exist.</p>
        <Link to="/" className="mt-4 inline-block text-primary">Go to home</Link>
      </Card>
    </div>
  );
}
