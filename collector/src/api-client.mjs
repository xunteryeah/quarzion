export class ApiClient {
  constructor({ baseUrl, secret, workerId, collectorVersion, label }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.secret = secret;
    this.workerId = workerId;
    this.collectorVersion = collectorVersion;
    this.label = label;
  }

  async request(path, init = {}, accepted = [200]) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        "X-Quarzion-Worker-Id": this.workerId,
        ...(init.headers || {}),
      },
    });
    if (!accepted.includes(response.status)) {
      const body = await response.text();
      throw new Error(`Quarzion API ${path} 返回 ${response.status}: ${body.slice(0, 500)}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  register(supportedPlatforms = ["doubao", "qwen", "deepseek"], metadata = {}) {
    return this.request("/api/collector/register", { method: "POST", body: JSON.stringify({ workerId: this.workerId, label: this.label, collectorVersion: this.collectorVersion, supportedPlatforms, ...metadata }) });
  }

  next(platform) {
    const query = platform ? `?platform=${encodeURIComponent(platform)}` : "";
    return this.request(`/api/collector/next${query}`, {}, [200, 204, 423]);
  }

  heartbeat(runId, leaseToken) {
    return this.request("/api/collector/heartbeat", { method: "POST", body: JSON.stringify({ workerId: this.workerId, runId, leaseToken }) });
  }

  ingest(task, result) {
    return this.request("/api/collector/ingest", { method: "POST", body: JSON.stringify({ ...result, runId: task.runId, workerId: this.workerId, leaseToken: task.leaseToken, collectorVersion: this.collectorVersion }) });
  }
}
