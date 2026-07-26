import { describe, expect, it } from "vitest";

import { silentLogger } from "../../lib/logger/logger.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { normalizeInboundMessage } from "./inbound-messages.normalizer.js";
import {
  InboundMessageService,
  type ConnectionLookup,
} from "./inbound-messages.service.js";
import { resolveParser } from "./parsers/registry.js";

const INSTANCE = "vex-software-5f81089e";
const ORGANIZATION_ID = "org_123";

/** Seconds since epoch, like the captured payloads carry. */
function secondsAgo(seconds: number): number {
  return Math.floor(Date.now() / 1000) - seconds;
}

/**
 * A realistic `data`, shaped after the payloads captured from the live broker on
 * 2026-07-26 (see docs/evolution/05-webhooks.md) — including the fields we do
 * not read (`remoteJidAlt`, `addressingMode`, `status`), because a test built
 * from a trimmed payload would not catch us being accidentally strict.
 */
function buildData(overrides: Record<string, unknown> = {}): unknown {
  return {
    key: {
      remoteJid: "5511956291095@s.whatsapp.net",
      remoteJidAlt: "5511956291095@s.whatsapp.net",
      fromMe: false,
      id: "AC9103D165AE397609A6A20D78FF248E",
      participant: "", // captured: empty string in a 1:1, not absent
      addressingMode: "lid",
    },
    pushName: "João",
    status: "DELIVERY_ACK",
    message: { conversation: "Mensagem de teste" },
    messageType: "conversation",
    messageTimestamp: secondsAgo(5),
    instanceId: "628e74c4-f457-463e-a903-113e19b8e794",
    source: "android",
    ...overrides,
  };
}

describe("normalizeInboundMessage", () => {
  it("reads a plain text message", () => {
    const message = normalizeInboundMessage(INSTANCE, buildData());

    expect(message.content).toEqual({ kind: "text", text: "Mensagem de teste" });
    expect(message.externalId).toBe("AC9103D165AE397609A6A20D78FF248E");
    expect(message.senderNumber).toBe("5511956291095");
    expect(message.senderName).toBe("João");
    expect(message.isGroup).toBe(false);
  });

  it("ignores messageContextInfo when picking the content key", () => {
    // Captured: `message` carries metadata alongside the content, and the
    // metadata can come FIRST. Taking the first key would read the wrong one.
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({
        message: {
          messageContextInfo: { deviceListMetadataVersion: 2 },
          conversation: "Mensagem de teste",
        },
      }),
    );

    expect(message.content).toEqual({ kind: "text", text: "Mensagem de teste" });
  });

  it("reads a quoted reply as ordinary text", () => {
    // Captured 2026-07-26: Evolution v2.3.7 flattens extendedTextMessage — the
    // quote is hoisted to data.contextInfo (a sibling of `message`) and the text
    // stays in message.conversation. Replying with a quote and sending links
    // both produced this, never an extendedTextMessage key. This test is here so
    // nobody "fixes" the text parser by adding a key that never arrives.
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({
        message: {
          messageContextInfo: { deviceListMetadataVersion: 2 },
          conversation: "Teste",
        },
        contextInfo: {
          stanzaId: "A5C6199A603479DA189DBC0EB1FE83D7",
          participant: "84761901039625@lid",
          quotedMessage: { conversation: "Opa" },
        },
      }),
    );

    expect(message.content).toEqual({ kind: "text", text: "Teste" });
  });

  it("keeps a 1:1 sender when participant is the captured empty string", () => {
    const message = normalizeInboundMessage(INSTANCE, buildData());

    expect(message.senderJid).toBe("5511956291095@s.whatsapp.net");
  });

  it("reads the real sender of a group message from participant", () => {
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({
        key: {
          remoteJid: "120363000000000000@g.us",
          fromMe: false,
          id: "GROUP_MSG_1",
          participant: "5511956291095@s.whatsapp.net",
        },
      }),
    );

    expect(message.isGroup).toBe(true);
    expect(message.chatJid).toBe("120363000000000000@g.us");
    expect(message.senderJid).toBe("5511956291095@s.whatsapp.net");
    expect(message.senderNumber).toBe("5511956291095");
  });

  it("turns the second-scale timestamp into a Date", () => {
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({ messageTimestamp: 1785100386 }),
    );

    expect(message.timestamp).toEqual(new Date(1785100386 * 1000));
  });

  it("accepts a stringified timestamp", () => {
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({ messageTimestamp: "1785100386" }),
    );

    expect(message.timestamp).toEqual(new Date(1785100386 * 1000));
  });

  it("treats an absent fromMe as false", () => {
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({
        key: { remoteJid: "5511956291095@s.whatsapp.net", id: "NO_FROM_ME" },
      }),
    );

    expect(message.fromMe).toBe(false);
  });

  it("reports null when the sender set no pushName", () => {
    const data = buildData();
    delete (data as Record<string, unknown>).pushName;

    expect(normalizeInboundMessage(INSTANCE, data).senderName).toBeNull();
  });

  it("accepts unknown extra fields", () => {
    // A newer Evolution adding a field must never turn traffic into dead letters.
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({ somethingBrandNew: { nested: true }, anotherOne: 42 }),
    );

    expect(message.content).toEqual({ kind: "text", text: "Mensagem de teste" });
  });

  it("reports an unsupported type with the raw key that names it", () => {
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({
        message: {
          messageContextInfo: { deviceListMetadataVersion: 2 },
          imageMessage: { mimetype: "image/jpeg", caption: "olha isso" },
        },
        messageType: "imageMessage",
      }),
    );

    expect(message.content).toEqual({
      kind: "unsupported",
      rawType: "imageMessage",
    });
  });

  it("reports unsupported when the content is only metadata", () => {
    const message = normalizeInboundMessage(
      INSTANCE,
      buildData({ message: { messageContextInfo: { threadId: [] } } }),
    );

    expect(message.content.kind).toBe("unsupported");
  });

  it.each([
    ["no key.id", { key: { remoteJid: "5511956291095@s.whatsapp.net" } }],
    ["no key.remoteJid", { key: { id: "X" } }],
    ["no message", { message: undefined }],
  ])("rejects a payload with %s", (_label, overrides) => {
    const data = buildData(overrides as Record<string, unknown>);
    if ((overrides as Record<string, unknown>).message === undefined) {
      delete (data as Record<string, unknown>).message;
    }

    expect(() => normalizeInboundMessage(INSTANCE, data)).toThrow(
      ValidationError,
    );
  });
});

describe("parser registry", () => {
  it("resolves the text parser by its captured key", () => {
    expect(resolveParser("conversation")).not.toBeNull();
  });

  it("has no parser for a type nobody wrote yet", () => {
    expect(resolveParser("imageMessage")).toBeNull();
  });
});

/** A lookup that answers for one instance and records whether it was consulted. */
function buildLookup(known = INSTANCE): ConnectionLookup & { calls: number } {
  return {
    calls: 0,
    async findByInstanceName(instanceName: string) {
      this.calls += 1;
      return instanceName === known ? { organizationId: ORGANIZATION_ID } : null;
    },
  };
}

describe("InboundMessageService", () => {
  it("processes a text message from a contact", async () => {
    const lookup = buildLookup();
    const service = new InboundMessageService(lookup, silentLogger);

    const result = await service.handleInboundMessage(INSTANCE, buildData());

    expect(result.status).toBe("processed");
    if (result.status !== "processed") throw new Error("unreachable");
    expect(result.message.organizationId).toBe(ORGANIZATION_ID);
    expect(result.message.content).toEqual({
      kind: "text",
      text: "Mensagem de teste",
    });
  });

  it("processes an unsupported type instead of failing on it", async () => {
    const service = new InboundMessageService(buildLookup(), silentLogger);

    const result = await service.handleInboundMessage(
      INSTANCE,
      buildData({ message: { audioMessage: { seconds: 3 } } }),
    );

    expect(result.status).toBe("processed");
    if (result.status !== "processed") throw new Error("unreachable");
    expect(result.message.content).toEqual({
      kind: "unsupported",
      rawType: "audioMessage",
    });
  });

  it("drops its own messages without touching the database", async () => {
    const lookup = buildLookup();
    const service = new InboundMessageService(lookup, silentLogger);

    const result = await service.handleInboundMessage(
      INSTANCE,
      buildData({
        key: {
          remoteJid: "5511956291095@s.whatsapp.net",
          fromMe: true,
          id: "A5E7737B91A6BF5BF7D4658A891BA508",
          participant: "",
        },
      }),
    );

    expect(result).toEqual({ status: "ignored", reason: "from-me" });
    // The cheap filters run before the lookup — one query per echo would be a
    // query per message the bot itself sends.
    expect(lookup.calls).toBe(0);
  });

  it("drops group messages", async () => {
    const service = new InboundMessageService(buildLookup(), silentLogger);

    const result = await service.handleInboundMessage(
      INSTANCE,
      buildData({
        key: {
          remoteJid: "120363000000000000@g.us",
          id: "G1",
          participant: "5511956291095@s.whatsapp.net",
        },
      }),
    );

    expect(result).toEqual({ status: "ignored", reason: "group" });
  });

  it("drops status/broadcast traffic", async () => {
    const service = new InboundMessageService(buildLookup(), silentLogger);

    const result = await service.handleInboundMessage(
      INSTANCE,
      buildData({ key: { remoteJid: "status@broadcast", id: "S1" } }),
    );

    expect(result).toEqual({ status: "ignored", reason: "broadcast" });
  });

  it("drops the history a fresh connection replays", async () => {
    const service = new InboundMessageService(buildLookup(), silentLogger);

    const result = await service.handleInboundMessage(
      INSTANCE,
      buildData({ messageTimestamp: secondsAgo(2 * 60 * 60) }),
    );

    expect(result).toEqual({ status: "ignored", reason: "too-old" });
  });

  it("rejects an instance that is not ours", async () => {
    const service = new InboundMessageService(buildLookup(), silentLogger);

    await expect(
      service.handleInboundMessage("someone-elses-instance", buildData()),
    ).rejects.toThrow(NotFoundError);
  });
});
