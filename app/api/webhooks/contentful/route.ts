import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

/**
 * Contentful Webhook Handler
 *
 * This endpoint handles webhooks from Contentful to trigger cache revalidation
 * when content is created, updated, or deleted.
 *
 * Webhook events handled:
 * - Entry.publish
 * - Entry.unpublish
 * - Entry.delete
 * - Entry.archive
 * - Entry.unarchive
 */

function verifyContentfulSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  // Contentful sends the signature in the format: "sha256=<hash>"
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  return signature === `sha256=${hash}`;
}

function verifyWebhookRequest(
  request: NextRequest,
  body: string,
  webhookSecret: string,
): boolean {
  // Method 1: Check for HMAC signature (more secure)
  const signature = request.headers.get("x-contentful-webhook-signature");
  if (signature) {
    return verifyContentfulSignature(body, signature, webhookSecret);
  }

  // Method 2: Check for simple secret token in header (fallback)
  const secretHeader = request.headers.get("x-contentful-secret");
  if (secretHeader) {
    return secretHeader === webhookSecret;
  }

  // If neither method is present, reject the request
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const webhookSecret = process.env.CONTENTFUL_WEBHOOK_SECRET;

    // Verify webhook secret is configured
    if (!webhookSecret) {
      console.error("CONTENTFUL_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    // Verify the webhook request (signature or secret token)
    if (!verifyWebhookRequest(request, body, webhookSecret)) {
      console.error("Invalid webhook authentication");
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 },
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);
    const { sys, fields } = payload;

    // Extract content type and event type
    const contentTypeId = sys?.contentType?.sys?.id;
    const eventType = sys?.type; // e.g., "Entry", "Asset"
    const action = payload.sys?.type; // This might be in metadata or we need to check headers

    // Get the X-Contentful-Topic header to determine the action
    const topic = request.headers.get("x-contentful-topic");
    // Format: ContentType.Entry.publish, ContentType.Entry.unpublish, etc.
    const topicParts = topic?.split(".") || [];
    const actionType = topicParts[topicParts.length - 1]; // publish, unpublish, delete, etc.

    console.log(
      `Contentful webhook received: ${contentTypeId} - ${actionType}`,
    );

    // Handle different content types
    if (contentTypeId === "blog") {
      // Revalidate blog-related pages
      revalidatePath("/writing");
      revalidatePath("/rss.xml");

      // If we have a slug, revalidate the specific post page
      if (fields?.slug) {
        // Handle different slug formats from Contentful
        let slug: string | undefined;
        if (typeof fields.slug === "string") {
          slug = fields.slug;
        } else if (typeof fields.slug === "object") {
          // Try common locale formats
          slug =
            fields.slug["en-US"] ||
            fields.slug["en"] ||
            Object.values(fields.slug)[0];
        }

        if (slug) {
          revalidatePath(`/writing/${slug}`);
          console.log(`Revalidated blog post: /writing/${slug}`);
        }
      }

      // Also revalidate the home page if it shows recent posts
      revalidatePath("/");

      return NextResponse.json({
        revalidated: true,
        contentType: "blog",
        action: actionType,
        paths: ["/writing", "/rss.xml", "/"],
        timestamp: new Date().toISOString(),
      });
    } else if (contentTypeId === "experiences") {
      // Revalidate experience page
      revalidatePath("/experience");
      revalidatePath("/"); // Home page might show experiences

      return NextResponse.json({
        revalidated: true,
        contentType: "experiences",
        action: actionType,
        paths: ["/experience", "/"],
        timestamp: new Date().toISOString(),
      });
    }

    // If content type is not recognized, still return success
    // but log it for debugging
    console.warn(`Unknown content type: ${contentTypeId}`);

    return NextResponse.json({
      revalidated: false,
      message: `Content type ${contentTypeId} not configured for revalidation`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing Contentful webhook:", error);
    return NextResponse.json(
      {
        error: "Error processing webhook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Handle GET requests for webhook verification/testing
export async function GET() {
  return NextResponse.json({
    message: "Contentful webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
