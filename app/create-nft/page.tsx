"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, ImageIcon, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import NavBar from "@/components/NavBar";
import { useAccount, useDeployContract } from "wagmi";
import lighthouse from "@lighthouse-web3/sdk";

import NFT from "../contracts/NFT.json";
import NFTMintSuccess from "@/components/NFTMintSuccess";

function isLikelyRunningInsideBaseApp(): boolean {
  if (typeof window === "undefined") return false;

  const w = window as any;
  const ua = navigator.userAgent || "";
  const eth = w.ethereum as any;

  // Heurísticas razonables para “host con wallet context”
  if (w.__BASE_APP__ || w.BaseAppBridge || w.ReactNativeWebView) return true;
  if (eth && (eth.isCoinbaseWallet || eth.isCoinbaseBrowser)) return true;

  // Fallback por user-agent (no perfecto, pero útil)
  if (/Coinbase|CoinbaseWallet|CBWallet|BaseApp/i.test(ua)) return true;

  return false;
}

const lighthouseApiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_STORAGE_KEY;

export default function CreateNFT() {
  const router = useRouter();

  // Guardrail: mint solo en Base App
  const [canMintHere, setCanMintHere] = useState(false);
  useEffect(() => {
    setCanMintHere(isLikelyRunningInsideBaseApp());
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { isConnected } = useAccount();
  const { deployContractAsync } = useDeployContract();

  const [file, setFile] = useState<FileList>();
  const [fileMetadata, setFileMetadata] = useState<File | null>(null);

  const [isMinting, setIsMinting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMint, setProgressMint] = useState(0);

  const [isSuccess, setIsSuccess] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<{
    transactionHash: string;
    tokenURI: string;
    title: string;
    description: string;
    imageUrl: string;
  } | null>(null);
  
  const [ipfsCid, setIpfsCid] = useState<string>("");
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fl = event.target.files;
    const fm = event.target.files?.[0];
    if (fl && fm && fm.type.startsWith("image/")) {
      setFile(fl);
      setFileMetadata(fm);
      const url = URL.createObjectURL(fm);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const f = event.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setSelectedFile(f);
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const uploadFileToLighthouse = async (fl: FileList) => {
    if (!lighthouseApiKey) return;

    console.log("⏳Uploading image to Lighthouse...");
    const output = await lighthouse.upload(fl, lighthouseApiKey, undefined);
    console.log(
      "Image uploaded at: https://gateway.lighthouse.storage/ipfs/" +
        output.data.Hash,
    );
    return output.data.Hash;
  };
  const handleUploadToFilecoin = async () => {
  if (!file) {
    alert("Primero subí un archivo.");
    return;
  }
  try {
    setIsUploading(true);
    if (!ipfsCid) {
  alert("Primero hacé Upload to IPFS para obtener el CID.");
  return;
}

const tokenURI = `https://gateway.lighthouse.storage/ipfs/${ipfsCid}`;
    
    if (!lighthouseCID) {
      throw new Error("Lighthouse no devolvió CID");
    }
    
    setIpfsCid(lighthouseCID);
    
    console.log("✅ Uploaded to IPFS (Lighthouse) CID:", lighthouseCID);
    alert(`✅ IPFS CID: ${lighthouseCID}`);
    
    setIpfsCid(lighthouseCID);    
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ Upload error:", e);
    alert(`Upload ERROR: ${msg}`);
  } finally {
    setIsUploading(false);
  }
};
  
  const handleMintNFT = async () => {
    // Guardrail producto: web NO mintea
    if (!canMintHere) {
      alert(
        "Mint disponible solo dentro de Base App. Abrí Molotov desde Base App con tu wallet conectada.",
      );
      return;
    }

    if (!file || !title || !description) return;

    if (!isConnected) {
      alert("Connect your Wallet");
      return;
    }

    setIsMinting(true);
    setProgressMint(10);

    try {
      const lighthouseCID = await uploadFileToLighthouse(file);

      setProgressMint(50);

      if (!lighthouseCID) {
        throw new Error("Failed to upload metadata to Lighthouse");
      }

      setProgressMint(70);

      const tokenURI = `https://gateway.lighthouse.storage/ipfs/${lighthouseCID}`;

      const bytecode = NFT.bytecode as `0x${string}`;
      const transactionHash = await deployContractAsync({
        abi: NFT.abi,
        args: [title, description, tokenURI],
        bytecode,
      });

      console.log("👩‍💻transactionHash", transactionHash);

      setProgressMint(80);
      setProgressMint(90);
      setProgressMint(100);

      setIsMinting(false);
      setMintedNFT({
        transactionHash: transactionHash,
        tokenURI: tokenURI,
        title: title,
        description: description,
        imageUrl: previewUrl,
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("❌ Error minting NFT:", error);
      setIsMinting(false);
      setProgressMint(0);
      alert(
        `Failed to mint NFT: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setMintedNFT(null);
    setFile(undefined);
    setFileMetadata(null);
    setPreviewUrl("");
    setTitle("");
    setDescription("");
    setProgressMint(0);
  };

  if (isSuccess && mintedNFT) {
    return (
      <NFTMintSuccess
        transactionHash={mintedNFT.transactionHash}
        tokenURI={mintedNFT.tokenURI}
        title={mintedNFT.title}
        description={mintedNFT.description}
        imageUrl={mintedNFT.imageUrl}
        onReset={handleReset}
        onExplore={() => router.push("/")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <button
            className="gap-2 flex items-center justify-center py-1 cursor-pointer mb-4 -mt-2 font-medium"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 text-black" />
            Back
          </button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Create Your NFT
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload your digital artwork and mint it as an NFT on the blockchain
            </p>

            {!canMintHere && (
              <div className="mt-4 rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
                <b>Mint deshabilitado en web.</b> Para mintear NFTs, abrí Molotov
                desde <b>Base App</b> con tu wallet conectada.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <Card className="border-border/50 flex flex-col h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Upload Artwork
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 text-center transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                      />
                      <p className="text-sm text-muted-foreground">
                        {selectedFile?.name}
                      </p>
                      <Button variant="outline" size="sm">
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-foreground mb-2">
                          Drop your file here, or browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supports: JPG, PNG, GIF, SVG
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*,video/*,audio/*,.glb,.gltf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <div className="flex justify-center pt-2 items-end h-full">
                  <Button
                    onClick={handleUploadToFilecoin}
                    disabled={!fileMetadata}
                    className="text-lg px-12 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading to IPFS..." : "Upload To IPFS"}
                    {isUploading && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 ">
                        <div
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `100%` }}
                        ></div>
                      </div>
                    )}
                  </Button>
                </div>

                {isUploading === false && file && <p>✅ Upload finished</p>}
              </CardContent>
            </Card>

            <Card className="border-border/50 flex flex-col h-full">
              <CardHeader>
                <CardTitle>NFT Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    TITLE
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-border focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    SYMBOL
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter symbol..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-border focus:border-primary min-h-[120px] resize-none"
                  />
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    size="lg"
                    className="text-lg px-12 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                    disabled={
                      !file || !fileMetadata || !title || !description || !canMintHere
                    }
                    onClick={handleMintNFT}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isMinting
                      ? "Deploying your Digital Art Work..."
                      : canMintHere
                        ? "Deploy Digital Art Work"
                        : "Open in Base App to mint"}
                    {isMinting && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 ">
                        <div
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progressMint}%` }}
                        ></div>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8 border-border/50 bg-card/30">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">
                What happens when you mint?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  Your artwork will be uploaded to IPFS for decentralized storage thanks to Filecoin
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
