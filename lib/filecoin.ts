"use client";
import { useState } from "react";
  // TOKENS,
  // CONTRACT_ADDRESSES,
} from "@filoz/synapse-sdk";
// import { ethers } from "ethers";
import { useState } from "react";

const RPC_URL = RPC_URLS.calibration.websocket;

export type UploadedInfo = {
  fileName?: string;
  fileSize?: number;
  commp?: string;
  txHash?: string;
};

export const useFileUpload = () => {
  const [progress, setProgress] = useState(0);
  const uploadFile = async (file: File) => {
    setProgress(0);

const formData = new FormData();
formData.append("file", file);

setProgress(40);

const res = await fetch("/api/filecoin/upload", {
  method: "POST",
  body: formData,
});

if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  throw new Error(data?.error || "Upload failed");
}

const data = await res.json();

setProgress(100);

return data.cid as string;
  };

  return {
    uploadFile,
    progress,
  };
};
