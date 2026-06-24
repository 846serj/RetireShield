import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const plaidEnv = process.env.PLAID_ENV ?? "sandbox";

if (!Object.prototype.hasOwnProperty.call(PlaidEnvironments, plaidEnv)) {
  throw new Error("PLAID_ENV must be one of sandbox, development, or production");
}

export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[plaidEnv as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);
