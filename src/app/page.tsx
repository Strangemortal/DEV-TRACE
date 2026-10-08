import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "admin") {
    redirect("/admin");
  } else if (session.role === "interviewer") {
    redirect("/interviewer");
  } else {
    redirect("/ide");
  }
}
