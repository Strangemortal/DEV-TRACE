import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffGatewayPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login/staff");
  }

  if (session.role === "admin") {
    redirect("/admin");
  } else if (session.role === "interviewer") {
    redirect("/interviewer");
  } else {
    // If a candidate somehow hits this, redirect directly to candidate IDE
    redirect("/ide");
  }
}
