import SeriesPage from "@/components/home/SeriesPage";

export default async function Serie({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SeriesPage id={decodeURIComponent(id)} />;
}
