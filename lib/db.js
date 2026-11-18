import postgres from "postgres";
const g = globalThis;
export const sql =
  g.__sql || (g.__sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, prepare: false }));
