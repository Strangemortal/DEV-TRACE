import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("devtrace_session")?.value;

    if (token) {
      const db = await readDb();
      if (db.sessions[token]) {
        delete db.sessions[token];
        await writeDb(db);
      }
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete("devtrace_session");

    return response;
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
