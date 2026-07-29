import { describe, expect, it } from "vitest";

import type { FlowDocument } from "../automations/flow.schema.js";
import { createFlowGraph } from "./flow-graph.js";

function document(overrides: Partial<FlowDocument> = {}): FlowDocument {
  return {
    schemaVersion: 1,
    nodes: [],
    edges: [],
    variables: [],
    ...overrides,
  };
}

const position = { x: 0, y: 0 };

describe("createFlowGraph", () => {
  describe("startNode", () => {
    it("finds the start node whatever its position in the array", () => {
      const graph = createFlowGraph(
        document({
          nodes: [
            { id: "text-1", type: "text", position, data: {} },
            { id: "start-1", type: "start", position, data: {} },
          ],
        }),
      );

      expect(graph.startNode()?.id).toBe("start-1");
    });

    it("returns null when the document has no start node", () => {
      const graph = createFlowGraph(
        document({ nodes: [{ id: "text-1", type: "text", position, data: {} }] }),
      );

      expect(graph.startNode()).toBeNull();
    });
  });

  describe("next", () => {
    const twoBlocks = document({
      nodes: [
        { id: "start-1", type: "start", position, data: {} },
        { id: "text-1", type: "text", position, data: {} },
      ],
      edges: [
        {
          id: "e1",
          source: "start-1",
          sourceHandle: "out",
          target: "text-1",
          targetHandle: "in",
        },
      ],
    });

    it("follows the edge leaving the given handle", () => {
      expect(createFlowGraph(twoBlocks).next("start-1", "out")?.id).toBe("text-1");
    });

    // The end of a flow is an output with no edge, not a special node: that is
    // what lets someone finish a flow by simply not connecting the last block.
    it("returns null for a handle with no edge", () => {
      expect(createFlowGraph(twoBlocks).next("text-1", "out")).toBeNull();
    });

    it("tells two outputs of the same node apart", () => {
      const graph = createFlowGraph(
        document({
          nodes: [
            { id: "wait-1", type: "waitReply", position, data: {} },
            { id: "text-reply", type: "text", position, data: {} },
            { id: "text-timeout", type: "text", position, data: {} },
          ],
          edges: [
            {
              id: "e1",
              source: "wait-1",
              sourceHandle: "reply",
              target: "text-reply",
              targetHandle: "in",
            },
            {
              id: "e2",
              source: "wait-1",
              sourceHandle: "timeout",
              target: "text-timeout",
              targetHandle: "in",
            },
          ],
        }),
      );

      expect(graph.next("wait-1", "reply")?.id).toBe("text-reply");
      expect(graph.next("wait-1", "timeout")?.id).toBe("text-timeout");
    });

    // A randomizer's outputs come from its data, so the graph must not assume a
    // fixed set of handle names anywhere.
    it("resolves an arbitrary handle name, as a randomizer produces", () => {
      const graph = createFlowGraph(
        document({
          nodes: [
            { id: "rand-1", type: "randomizer", position, data: {} },
            { id: "text-b", type: "text", position, data: {} },
          ],
          edges: [
            {
              id: "e1",
              source: "rand-1",
              sourceHandle: "out-2",
              target: "text-b",
              targetHandle: "in",
            },
          ],
        }),
      );

      expect(graph.next("rand-1", "out-2")?.id).toBe("text-b");
    });

    // A dangling edge must end the flow, not crash the worker mid-conversation.
    it("returns null when the edge points at a node that does not exist", () => {
      const graph = createFlowGraph(
        document({
          nodes: [{ id: "start-1", type: "start", position, data: {} }],
          edges: [
            {
              id: "e1",
              source: "start-1",
              sourceHandle: "out",
              target: "ghost",
              targetHandle: "in",
            },
          ],
        }),
      );

      expect(graph.next("start-1", "out")).toBeNull();
    });
  });

  describe("nodeById", () => {
    it("returns the node, with its type and data", () => {
      const graph = createFlowGraph(
        document({
          nodes: [
            { id: "text-1", type: "text", position, data: { text: "oi" } },
          ],
        }),
      );

      expect(graph.nodeById("text-1")).toMatchObject({
        id: "text-1",
        type: "text",
        data: { text: "oi" },
      });
    });

    it("returns null for an unknown id", () => {
      expect(createFlowGraph(document()).nodeById("ghost")).toBeNull();
    });
  });
});
