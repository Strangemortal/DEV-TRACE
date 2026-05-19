import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { code, language = "python" } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required and must be a string." },
        { status: 400 }
      );
    }

    if (!["python", "cpp", "java"].includes(language)) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    // Create a unique subdirectory per run
    const fileId = crypto.randomUUID();
    const runDir = path.join(process.cwd(), "tmp_code", fileId);
    await fs.mkdir(runDir, { recursive: true });

    let command: string;

    try {
      if (language === "python") {
        await fs.writeFile(path.join(runDir, "main.py"), code, "utf-8");
        command = `podman run --rm --network none --memory 128m -v "${runDir}":/usr/src/app:Z -w /usr/src/app python:3.9-alpine python main.py`;
      } else if (language === "cpp") {
        await fs.writeFile(path.join(runDir, "main.cpp"), code, "utf-8");
        command = `podman run --rm --network none --memory 256m -v "${runDir}":/usr/src/app:Z -w /usr/src/app gcc:12 bash -c "g++ -o output main.cpp && ./output"`;
      } else {
        // java — public class MUST be named Main, file MUST be Main.java
        await fs.writeFile(path.join(runDir, "Main.java"), code, "utf-8");
        command = `podman run --rm --network none --memory 256m -v "${runDir}":/usr/src/app:Z -w /usr/src/app eclipse-temurin:17-jdk bash -c "javac Main.java && java Main"`;
      }

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      return NextResponse.json({ output: stdout, error: stderr });
    } catch (execError: any) {
      console.error("Execution error:", execError);
      return NextResponse.json({
        output: execError.stdout || "",
        error: execError.stderr || execError.message || "Execution failed.",
      });
    } finally {
      // Clean up the unique run directory
      try {
        await fs.rm(runDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`Failed to delete ${runDir}:`, cleanupError);
      }
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
