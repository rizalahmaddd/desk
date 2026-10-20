import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  return jsonResponse({
    success: true,
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      image: auth.user.image,
      createdAt: auth.user.createdAt,
    },
    authType: auth.authType,
  });
}
