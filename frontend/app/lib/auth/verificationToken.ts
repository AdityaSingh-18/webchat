const secret = process.env.VERIFICATION_COOKIE_SECRET;

if (!secret) {
  throw new Error("VERIFICATION_COOKIE_SECRET is not configured");
}

const encoder = new TextEncoder();

function encodeBytes(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBytes(value: string) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");

  const binary = atob(base64);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
}

async function createSignature(value: string) {
  const key = await getKey();

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return encodeBytes(new Uint8Array(signature));
}

export async function createVerificationToken(email: string) {
  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);

  const payload = {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: encodeBytes(nonce),
  };

  const encodedPayload = encodeBytes(
    encoder.encode(JSON.stringify(payload))
  );

  const signature = await createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyVerificationToken(token: string) {
  try {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
      return null;
    }

    const key = await getKey();

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBytes(signature),
      encoder.encode(encodedPayload)
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(
        decodeBytes(encodedPayload)
      )
    );

    if (
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.nonce !== "string"
    ) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return {
      email: payload.email,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}