import type { Content, Draft } from "./types";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api" + path, options);
  if (!response.ok) {
    let message = "请求失败，请检查后端服务";
    try {
      const body = await response.json();
      message = body.message || body.detail || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
export const api = {
  list: () => request<Content[]>("/contents"),
  create: (draft: Draft, file: File | null) => {
    const data = new FormData();
    data.append("metadata", new Blob([JSON.stringify(draft)], { type: "application/json" }));
    if (file) data.append("file", file);
    return request<Content>("/contents", { method: "POST", body: data });
  },
  analyze: (id: string) => request<Content>(`/contents/${id}/analyze`, { method: "POST" }),
  archive: (id: string) => request<Content>(`/contents/${id}/archive`, { method: "POST" }),
  updateBody: (id: string, body: string) =>
    request<Content>(`/contents/${id}/body`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),
  feedback: (id: string, data: object) =>
    request<Content>(`/contents/${id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};
