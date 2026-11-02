import { apiErrorResponse, opErrorResponse, resolveSessionHostOr404 } from "@/lib/api-utils";
import { getContentDisposition } from "@/lib/content-disposition";


/** Render a session to self-contained HTML with the omp binary on its host (`omp --export`). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const resolved = await resolveSessionHostOr404(id);
    if ("response" in resolved) return resolved.response;
    const result = await resolved.host.sessionOps.exportSession(id);
    if (!result.ok) return opErrorResponse(result);
    // Attachment-only, even when ?inline=1 is requested: omp embeds
    // transcript text into the exported HTML without escaping it, so an
    // attacker-influenced message (event-handler attributes survive
    // innerHTML parsing) would execute in omp-web's origin if the export
    // were rendered inline — with the owner's cookies and same-origin API
    // access. A route-level sandboxed CSP cannot fix this: config-level
    // headers overwrite same-key route headers (see next.config.ts), so
    // the global CSP's `unsafe-inline` would win. Downloading keeps the
    // feature working without ever rendering untrusted HTML as omp-web.
    return new Response(result.value.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": getContentDisposition(result.value.fileName, false, "session.html"),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
