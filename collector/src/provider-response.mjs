function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => typeof part === "string" ? part : String(part?.text || part?.content || ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function extractAnswerText(body) {
  if (typeof body?.output_text === "string") return body.output_text.trim();
  const responseMessages = Array.isArray(body?.output)
    ? body.output.filter((item) => item?.type === "message").map((item) => textFromContent(item.content)).filter(Boolean)
    : [];
  if (responseMessages.length) return responseMessages.join("\n").trim();
  const openAiText = textFromContent(body?.choices?.[0]?.message?.content);
  if (openAiText) return openAiText;
  return textFromContent(body?.output?.choices?.[0]?.message?.content);
}

function citationFrom(value) {
  if (!value || typeof value !== "object") return null;
  const nested = value.url_citation && typeof value.url_citation === "object" ? value.url_citation : value;
  const url = String(nested.url || nested.link || nested.source_url || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    url,
    title: String(nested.title || nested.name || "").trim() || undefined,
    snippet: String(nested.snippet || nested.text || nested.content || "").trim() || undefined,
    providerSourceId: String(nested.id || nested.source_id || "").trim() || undefined,
  };
}

function collectCitationCandidates(body) {
  const candidates = [];
  const output = Array.isArray(body?.output) ? body.output : [];
  for (const item of output) {
    const sources = item?.action?.sources || item?.sources;
    if (Array.isArray(sources)) candidates.push(...sources);
    if (!Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      if (Array.isArray(part?.annotations)) candidates.push(...part.annotations);
    }
  }
  const searchInfo = body?.output?.search_info || body?.output?.choices?.[0]?.message?.search_info;
  if (Array.isArray(searchInfo?.search_results)) candidates.push(...searchInfo.search_results);
  if (Array.isArray(body?.search_results)) candidates.push(...body.search_results);
  return candidates;
}

export function extractCitations(body) {
  const seen = new Set();
  return collectCitationCandidates(body)
    .map(citationFrom)
    .filter(Boolean)
    .filter((citation) => !seen.has(citation.url) && Boolean(seen.add(citation.url)))
    .map((citation, index) => ({ ...citation, index: index + 1 }));
}

export function extractUsage(body) {
  const usage = body?.usage || body?.output?.usage || {};
  return {
    inputTokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0,
    outputTokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0,
    reasoningTokens: Number(usage.output_tokens_details?.reasoning_tokens ?? usage.completion_tokens_details?.reasoning_tokens ?? 0) || 0,
    cachedTokens: Number(usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0) || 0,
  };
}

export function searchWasPerformed(body) {
  if (Array.isArray(body?.output) && body.output.some((item) => item?.type === "web_search_call")) return true;
  const searchInfo = body?.output?.search_info || body?.output?.choices?.[0]?.message?.search_info;
  return Array.isArray(searchInfo?.search_results) && searchInfo.search_results.length > 0;
}

export function responseRequestId(body, headers) {
  return String(
    headers?.get?.("x-request-id")
      || headers?.get?.("request-id")
      || headers?.get?.("x-dashscope-request-id")
      || body?.request_id
      || body?.id
      || "",
  ).trim() || null;
}

