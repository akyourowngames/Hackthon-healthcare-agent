import type { Metadata } from "next";
import AssistantConsole from "@/components/AssistantConsole";

export const metadata: Metadata = {
  title: "Vaidy Assistant",
  description: "Local report-memory assistant powered by the Vaidy healthcare agent.",
};

export default function ChatPage() {
  return <AssistantConsole />;
}
