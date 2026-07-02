import type { Metadata } from "next";
import NotFoundUI from "@/components/ui/NotFoundUI";

export const metadata: Metadata = {
  title: "404 — Page Not Found · FutureGrid",
  description: "This page drifted off the grid.",
};

export default function NotFound() {
  return <NotFoundUI />;
}
