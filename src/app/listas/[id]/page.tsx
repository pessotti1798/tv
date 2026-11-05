import ListPage from "@/components/home/ListPage";

export default async function Lista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListPage id={decodeURIComponent(id)} />;
}
