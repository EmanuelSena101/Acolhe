import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./public/uploads";
const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Arquivo excede o limite de ${MAX_UPLOAD_SIZE_MB}MB.` },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["csv", "xml", "zip"];
    if (!ext || !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "Tipo de arquivo nao suportado. Aceitos: .csv, .xml, .zip" },
        { status: 400 },
      );
    }

    const uploadId = randomUUID();
    const uploadDir = join(UPLOADS_DIR, uploadId);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadDir, file.name);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      uploadId,
      fileName: file.name,
      size: file.size,
      path: filePath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erro interno no upload." }, { status: 500 });
  }
}
