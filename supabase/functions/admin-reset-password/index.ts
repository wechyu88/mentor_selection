import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "https://wechyu88.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const token = request.headers.get("Authorization");
  if (!token) return new Response(JSON.stringify({ error: "未登录" }), { status: 401, headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: token } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "登录已失效" }), { status: 401, headers });
  const { data: operator } = await admin.from("profiles").select("role,active").eq("id", user.id).single();
  if (!operator || !operator.active || operator.role !== "admin") return new Response(JSON.stringify({ error: "管理员权限不足" }), { status: 403, headers });
  const { targetUserId } = await request.json();
  if (typeof targetUserId !== "string") return new Response(JSON.stringify({ error: "缺少目标账户" }), { status: 400, headers });
  const { error: resetError } = await admin.auth.admin.updateUserById(targetUserId, { password: "123456" });
  if (resetError) return new Response(JSON.stringify({ error: resetError.message }), { status: 400, headers });
  await admin.from("profiles").update({ must_change_password: true }).eq("id", targetUserId);
  return new Response(JSON.stringify({ message: "密码已重置为 123456；该用户下次登录必须修改密码。" }), { headers });
});
