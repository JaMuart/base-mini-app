import { NextResponse } from "next/server";
import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";

export const runtime = "nodejs";

const RPC_URL = RPC_URLS.calibration.http;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  try {
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Missing FILECOIN_PRIVATE_KEY env var" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file in form-data (field: file)" },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    const synapse = await Synapse.create({
      privateKey,
      rpcURL: RPC_URL,
    });

    // Reintento simple: createStorage puede fallar por ping provider
    let storageService: any = null;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        storageService = await synapse.createStorage();
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
        // backoff: 0.5s, 1.5s, 3s
        await sleep(attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000);
      }
    }

    if (!storageService) {
      return NextResponse.json(
        {
          error:
            lastErr?.message ??
            "Failed to create storage service (all providers failed ping validation)",
          hint:
            "This is usually provider/network instability on Calibration. Try again later or switch network/provider configuration.",
        },
        { status: 500 },
      );
    }

    const pre = await storageService.preflightUpload(bytes.length);
    if (!pre.allowanceCheck?.sufficient) {
      return NextResponse.json(
        {
          error: "Storage allowance is insufficient; top-up required",
          details: pre.allowanceCheck,
        },
        { status: 402 },
      );
    }

    const result = await storageService.upload(bytes);
    const cid = result.commp?.toString?.() ?? String(result.commp);

    return NextResponse.json({ cid });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 },
    );
  }
}
