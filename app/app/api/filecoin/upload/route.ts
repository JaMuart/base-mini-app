import { NextResponse } from "next/server";
import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";

export const runtime = "nodejs";

const RPC_URL = RPC_URLS.calibration.websocket;

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

    const arrayBuffer = await file.arrayBuffer();
    const uint8ArrayBytes = new Uint8Array(arrayBuffer);

    const synapse = await Synapse.create({
      privateKey,
      rpcURL: RPC_URL,
    });

    const storageService = await synapse.createStorage();

    const pre = await storageService.preflightUpload(uint8ArrayBytes.length);
    if (!pre.allowanceCheck.sufficient) {
      return NextResponse.json(
        { error: "Storage allowance is insufficient; top-up required" },
        { status: 402 },
      );
    }

    const result = await storageService.upload(uint8ArrayBytes);
    const cid = result.commp.toString();

    return NextResponse.json({ cid });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 },
    );
  }
}
