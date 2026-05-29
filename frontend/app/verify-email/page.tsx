import { redirect } from "next/navigation";

export default function VerifyEmailRedirect() {
  redirect("/auth?view=verify");
}
