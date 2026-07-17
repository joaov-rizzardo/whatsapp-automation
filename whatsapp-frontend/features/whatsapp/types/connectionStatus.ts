/**
 * The WhatsApp session states we render in the UI. Mirrors the lifecycle the
 * Evolution API exposes (open / connecting / close), reduced to what the sidebar
 * needs. When the real integration lands, map the API state onto this union.
 */
export type WhatsappConnectionStatus = "connected" | "connecting" | "disconnected";
