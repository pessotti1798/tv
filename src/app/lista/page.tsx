import { Suspense } from "react";
import ListRoute from "@/components/home/ListRoute";

export default function Lista() {
  return (
    <Suspense>
      <ListRoute />
    </Suspense>
  );
}
