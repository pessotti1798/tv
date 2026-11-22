import { Suspense } from "react";
import SeriesRoute from "@/components/home/SeriesRoute";

export default function Serie() {
  return (
    <Suspense>
      <SeriesRoute />
    </Suspense>
  );
}
