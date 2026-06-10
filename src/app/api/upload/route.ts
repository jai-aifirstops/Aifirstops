import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
    const targetDir = path.join(process.cwd(), uploadDir);

    await mkdir(targetDir, { recursive: true });

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const fullPath = path.join(targetDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(fullPath, Buffer.from(bytes));

    const publicPath = `/${uploadDir.replace(/^public\/?/, "")}/${filename}`;
    return NextResponse.json({ url: publicPath });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
