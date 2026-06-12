import { redirect } from "next/navigation";

// Root redirects to dashboard; middleware handles auth → /login if not authenticated
export default function RootPage() {
  redirect("/dashboard");
}
