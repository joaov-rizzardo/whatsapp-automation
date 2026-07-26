import { apiRequest } from "@/lib/http";

/** O cascade do banco leva rascunho e versões junto. */
export async function deleteAutomation(id: string): Promise<void> {
  await apiRequest(`/api/automations/${id}`, { method: "DELETE" });
}
