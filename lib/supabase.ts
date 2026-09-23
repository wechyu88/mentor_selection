import { createClient } from "@supabase/supabase-js";

// A publishable key is designed to be shipped to the browser. Database access
// is still constrained by the Row Level Security policies in the migration.
export const supabase = createClient(
  "https://iwctcihqnndeuwdsohyp.supabase.co",
  "sb_publishable_lpqLO_aNtWchRwWGbM8WYw_Zjd0zLmz",
);
