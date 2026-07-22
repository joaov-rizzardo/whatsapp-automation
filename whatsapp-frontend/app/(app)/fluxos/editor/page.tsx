import { FlowEditor } from "@/features/flows/components/FlowEditor";

/**
 * Prototype flow editor — reachable only by typing the URL (no menu link),
 * client-side only, no persistence. Inside the (app) group, so it inherits the
 * session + active-organization gate for free. The editor fills the content area.
 */
export default function FluxosEditorPage() {
  return (
    <div className="h-full w-full">
      <FlowEditor />
    </div>
  );
}
