import { NextResponse } from "next/server";
import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";

export const runtime = "nodejs";

const RPC_URL = RPC_URLS.calibration.http;

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

    // 1) Preflight (con CDN habilitado)
    const pre = await synapse.storage.preflightUpload(bytes.length, {
      withCDN: true,
    });

    if (!pre.allowanceCheck.sufficient) {
      return NextResponse.json(
        {
          error: "Storage allowance is insufficient; top-up required",
          details: pre.allowanceCheck,
        },
        { status: 402 },
      );
    }

    // 2) Contexto con CDN (suele ser más tolerante a providers inestables)
    const ctx = await synapse.storage.createContext({ withCDN: true });

    // 3) Upload
    const result = await ctx.upload(bytes, {
      pieceMetadata: {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      },
    });

    // Según la API, UploadResult te da el piece CID (commp) como string
    const cid = result.commp?.toString?.() ?? String(result.commp);

    return NextResponse.json({
      cid,
      provider: ctx.provider,
      dataSetId: ctx.dataSetId,
      withCDN: ctx.withCDN,
    });
  } catch (err: any) {
    // Si explota el ping validation, devolvemos info útil para debug
    const message = err?.message ?? "Upload failed";

    return NextResponse.json(
      {
        error: message,
        hint:
          "If you see ping validation failures, providers may be down/unreachable. Try again later, or select a provider explicitly.",
      },
      { status: 500 },
    );
  }
}
