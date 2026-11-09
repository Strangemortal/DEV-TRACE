import { NextResponse } from "next/server";
import os from "os";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: { name: string; ip: string }[] = [];

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      for (const net of netList) {
        // Skip internal (127.0.0.1) and IPv6 for simple mobile LAN connection
        if (net.family === "IPv4" && !net.internal) {
          addresses.push({
            name,
            ip: net.address,
          });
        }
      }
    }

    const port = process.env.PORT || "3000";
    
    // Pick the most likely Wi-Fi / LAN IP (prioritize 192.168.x or 10.x or 172.x)
    const primary =
      addresses.find(
        (a) =>
          a.ip.startsWith("192.168.") ||
          a.ip.startsWith("10.") ||
          a.ip.startsWith("172.")
      ) || addresses[0];

    const primaryIp = primary ? primary.ip : "localhost";
    const primaryUrl = `http://${primaryIp}:${port}`;

    // Generate crisp QR code Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(primaryUrl, {
      errorCorrectionLevel: "M",
      margin: 1.5,
      scale: 8,
      color: {
        dark: "#0b0f19",
        light: "#ffffff",
      },
    });

    const networkUrls = addresses.map((a) => ({
      name: a.name,
      ip: a.ip,
      url: `http://${a.ip}:${port}`,
      isPrimary: a.ip === primaryIp,
    }));

    return NextResponse.json({
      success: true,
      primaryIp,
      primaryUrl,
      port,
      qrCodeDataUrl,
      networkUrls,
      hostname: os.hostname(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
