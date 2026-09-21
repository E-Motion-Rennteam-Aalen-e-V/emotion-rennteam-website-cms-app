import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/cms/collections";
import { listItems } from "@/lib/cms/content";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { canAccessCollection } from "@/lib/cms/roles";
import CollectionExplorer from "@/components/admin/CollectionExplorer";

export default async function CollectionListPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection: collectionName } = await params;
  const collection = getCollection(collectionName);
  if (!collection) notFound();

  // AdminLayout weiter oben im Baum stellt bereits sicher, dass ueberhaupt
  // eine gueltige Session vorliegt - hier geht es nur noch um die
  // Rollen-Einschraenkung auf einzelne Collections (z.B. "Sponsoring-
  // Management" sieht nur "sponsor").
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session || !canAccessCollection(session, collectionName)) notFound();

  const items = await listItems(collectionName);

  return <CollectionExplorer key={collectionName} collectionName={collectionName} collection={collection} initialItems={items} />;
}
