import { z } from "zod";

const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;
const MAX_ATTACHMENT_BATCH_SIZE = 100 * 1024 * 1024;

const attachmentSchema = z.object({
  storagePath: z.string().trim().min(1).max(1024),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().nonnegative().max(MAX_ATTACHMENT_SIZE),
});

export const sendMessageSchema = z
  .object({
    receiverId: z.uuid(),
    content: z.string().trim().max(5000).optional(),
    attachments: z.array(attachmentSchema).max(20).optional(),
    replyToMessageId: z.uuid().optional(),
  })
  .transform((value, ctx) => {
    const content = value.content ?? "";
    const attachments = value.attachments ?? [];

    if (!content && attachments.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "Enter a message or attach at least one file.",
      });

      return z.NEVER;
    }

    const totalSize = attachments.reduce(
      (total, attachment) => total + attachment.sizeBytes,
      0,
    );

    if (totalSize > MAX_ATTACHMENT_BATCH_SIZE) {
      ctx.addIssue({
        code: "custom",
        path: ["attachments"],
        message: "Attachments cannot exceed 100 MB in total.",
      });

      return z.NEVER;
    }

    const paths = new Set<string>();

    for (const attachment of attachments) {
      if (paths.has(attachment.storagePath)) {
        ctx.addIssue({
          code: "custom",
          path: ["attachments"],
          message: "Duplicate attachment storage paths are not allowed.",
        });

        return z.NEVER;
      }

      paths.add(attachment.storagePath);
    }

    return {
      ...value,
      content,
      attachments,
    };
  });

export type SendMessageInput = z.output<typeof sendMessageSchema>;
