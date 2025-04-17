import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseProjectKey = process.env.SUPABASE_PROJECT_KEY;

const supabase = createClient(supabaseUrl, supabaseProjectKey);

export default supabase;
