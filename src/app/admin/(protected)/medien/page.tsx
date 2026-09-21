import MediaLibrary from "@/components/admin/MediaLibrary";
import { listUploadedImages } from "@/lib/cms/media";

export default async function MediaPage() {
  const files = await listUploadedImages();
  return <MediaLibrary initialFiles={files} />;
}
