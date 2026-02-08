import { Client } from "@upstash/qstash";

export const client = new Client({ token : process.env.QSTASH_TOKEN!});
