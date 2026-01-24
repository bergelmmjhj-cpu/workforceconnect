import type { QuoProvider } from "./provider";
import { MockQuoProvider } from "./mockProvider";
import { RealQuoProvider } from "./realProvider";

const USE_REAL_QUO = process.env.QUO_API_KEY && process.env.QUO_API_SECRET && process.env.QUO_API_BASE_URL;

let quoProvider: QuoProvider;

if (USE_REAL_QUO) {
  quoProvider = new RealQuoProvider();
} else {
  quoProvider = new MockQuoProvider();
}

export { quoProvider };
export type { QuoProvider } from "./provider";
