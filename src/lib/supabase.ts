import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wrsxsqslkdizerlnumvt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc3hzcXNsa2RpemVybG51bXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjU4OTYsImV4cCI6MjA4ODE0MTg5Nn0._Jap-8Dw0XW6Tvc8yWs1egVh3FuKN1jsooEdUwFr52c";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
