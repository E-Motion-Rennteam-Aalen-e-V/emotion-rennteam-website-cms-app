import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/cms/collections";
import { getItem, listItems, saveItem, slugify, ValidationError } from "@/lib/cms/content";
import { getSessionUser } from "@/lib/cms/auth";
import { canAccessCollection } from "@/lib/cms/roles";

export async function GET(request: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { collection: collectionName } = await params;
  const collection = getCollection(collectionName);
  if (!collection) return NextResponse.json({ error: "Unbekannte Collection." }, { status: 404 });
  if (!canAccessCollection(user, collectionName)) {
    return NextResponse.json({ error: "Keine Berechtigung für diese Collection." }, { status: 403 });
  }

  const items = await listItems(collectionName);
  return NextResponse.json({ collection, items });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { collection: collectionName } = await params;
  const collection = getCollection(collectionName);
  if (!collection) return NextResponse.json({ error: "Unbekannte Collection." }, { status: 404 });
  if (!canAccessCollection(user, collectionName)) {
    return NextResponse.json({ error: "Keine Berechtigung für diese Collection." }, { status: 403 });
  }

  let body: { slug?: string; data?: Record<string, unknown>; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const titleField = collection.fields.find((f) => f.isTitle);
  const titleValue = titleField ? String(body.data?.[titleField.name] ?? "") : "";
  const baseSlug = body.slug?.trim() ? slugify(body.slug) : slugify(titleValue);

  let slug = baseSlug;
  let suffix = 2;
  while (await getItem(collectionName, slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  try {
    const result = await saveItem(collectionName, slug, body.data ?? {}, body.body ?? "", user.username);
    return NextResponse.json({ slug, ...result });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." }, { status: 502 });
  }
}
