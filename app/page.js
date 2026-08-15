import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default function Home() {
  redirect(getSession() ? "/dashboard" : "/login");
}
