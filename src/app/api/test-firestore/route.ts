import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  await adminDb.collection("test").add({
    message: "deploy test ok",
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
