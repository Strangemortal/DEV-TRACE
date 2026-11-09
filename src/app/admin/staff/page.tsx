import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStaffRedirectPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login/staff");
  }

  if (session.role === "admin") {
    redirect("/admin");
  } else if (session.role === "interviewer") {
    redirect("/interviewer");
  } else {
    redirect("/ide");
  }
}
