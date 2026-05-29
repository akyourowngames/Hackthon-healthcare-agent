import { redirect } from "next/navigation";

export default function SetupProfileRedirect() {
  redirect("/dashboard/profile");
}
