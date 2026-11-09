import {
  SecretRequestAnswerInput,
  SecretRequestError,
  ThreadId,
  TurnItemId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import {
  secretRequestDisplay,
  secretRequestAnswerInput,
  secretRequestFailureMessage,
  secretRequestPrivacyNote,
} from "./secretRequest.ts";

const encodeAnswer = Schema.encodeSync(SecretRequestAnswerInput);
const decodeAnswer = Schema.decodeUnknownSync(SecretRequestAnswerInput);

it("preserves the entered secret through RPC encoding", () => {
  const item = { id: TurnItemId.make("secret-request"), threadId: ThreadId.make("thread") };
  for (const secret of ["token", " leading", "trailing ", "\t pass word \t"]) {
    const input = secretRequestAnswerInput(item, { type: "save", secret });
    expect(input).not.toBeNull();
    expect(decodeAnswer(encodeAnswer(input!)).answer).toEqual({ type: "save", secret });
  }
  for (const secret of ["", " \t "]) {
    expect(secretRequestAnswerInput(item, { type: "save", secret })).toBeNull();
  }
});

describe("secretRequestDisplay", () => {
  it("never offers the form for a request inherited from another thread", () => {
    expect(secretRequestDisplay({ secretStatus: "pending" }, "inherited")).toEqual({
      kind: "pending-elsewhere",
      label: "Waiting for an answer in the original thread",
    });
    expect(secretRequestDisplay({ secretStatus: "saved" }, "inherited")).toMatchObject({
      outcome: "saved",
    });
  });
});

describe("secretRequestPrivacyNote", () => {
  it("does not promise to hide a value that the agent's commands can read", () => {
    expect(secretRequestPrivacyNote({})).toBe("Stored securely, never shown to the agent");
    expect(secretRequestPrivacyNote({ delivery: "file" })).not.toContain("never shown");
  });
});

describe("secretRequestFailureMessage", () => {
  it("passes through server errors but hides anything that could echo the payload", () => {
    expect(
      secretRequestFailureMessage(new SecretRequestError({ reason: "already_answered" })),
    ).toBe("This secret request was already answered.");
    expect(secretRequestFailureMessage(new Error('Expected string, got "whsec_1"'))).toBe(
      "Could not answer the request. Try again.",
    );
    expect(secretRequestFailureMessage(undefined)).toBe("Could not answer the request. Try again.");
  });
});
