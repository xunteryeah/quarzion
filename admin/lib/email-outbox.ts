export type InvitationEmailPayload = {
  kind: "invitation";
  id: string;
  organizationName: string;
  email: string;
  role: string;
  invitationUrl: string;
  expiresAt: string;
};

function encryptionKeyBytes() {
  const value = process.env.QUARZION_OUTBOX_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("QUARZION_OUTBOX_ENCRYPTION_KEY 必须是 64 位十六进制密钥");
  return new Uint8Array(Buffer.from(value, "hex"));
}

export async function sealInvitationEmail(payload: InvitationEmailPayload) {
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return {
    ciphertext: Buffer.from(new Uint8Array(ciphertext)).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
  };
}
