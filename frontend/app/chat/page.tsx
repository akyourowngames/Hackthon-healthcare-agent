import type { Metadata } from "next";
import AssistantConsole from "@/components/AssistantConsole";

export const metadata: Metadata = {
  title: {
    absolute: "Chat with Your Health Reports | Vaidy AI Assistant",
  },
  description:
    "Ask questions about your blood reports in plain language. Upload CBC, thyroid, lipid panel reports and get instant AI explanations in Hindi or English.",
  alternates: {
    canonical: "https://vaidy.vercel.app/chat",
  },
  openGraph: {
    title: "Chat with Your Health Reports | Vaidy AI Assistant",
    description:
      "Ask questions about your blood reports in plain language. Upload CBC, thyroid, lipid panel reports and get instant AI explanations in Hindi or English.",
    url: "https://vaidy.vercel.app/chat",
  },
};

export default function ChatPage() {
  return <AssistantConsole />;
}
