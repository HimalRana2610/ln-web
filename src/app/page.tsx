import { redirect } from "next/navigation";

/** The app has no marketing page yet; middleware decides where a visitor lands. */
export default function RootPage() {
  redirect("/dashboard");
}
