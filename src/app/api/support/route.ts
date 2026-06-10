import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { subject?: string; message?: string; email?: string }
    | null;

  if (!body?.subject || !body?.message || !body?.email) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      subject: body.subject,
      message: body.message,
      email: body.email,
    },
  });

  return NextResponse.json({ id: ticket.id });
}
