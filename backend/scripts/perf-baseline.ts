type PerfSample = {
  endpoint: string;
  durationMs: number;
  ok: boolean;
  status: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function run() {
  const baseUrl = process.env.PERF_BASE_URL || 'http://localhost:5002/api';
  const token = process.env.PERF_AUTH_TOKEN;
  const iterations = Number(process.env.PERF_ITERATIONS || '15');

  if (!token) {
    throw new Error('PERF_AUTH_TOKEN is required');
  }

  const endpoints = [
    { path: '/rma?page=1&limit=50', name: 'GET /api/rma' },
    { path: '/analytics/dashboard?compact=true', name: 'GET /api/analytics/dashboard?compact=true' },
  ];

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const samples: PerfSample[] = [];

  for (const endpoint of endpoints) {
    for (let i = 0; i < iterations; i++) {
      const started = Date.now();
      const response = await fetch(`${baseUrl}${endpoint.path}`, { headers });
      const durationMs = Date.now() - started;
      samples.push({
        endpoint: endpoint.name,
        durationMs,
        ok: response.ok,
        status: response.status,
      });
    }
  }

  const grouped = new Map<string, PerfSample[]>();
  for (const sample of samples) {
    if (!grouped.has(sample.endpoint)) grouped.set(sample.endpoint, []);
    grouped.get(sample.endpoint)!.push(sample);
  }

  const results = Array.from(grouped.entries()).map(([endpoint, group]) => {
    const durations = group.map((s) => s.durationMs).sort((a, b) => a - b);
    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const failures = group.filter((s) => !s.ok).length;
    return { endpoint, samples: group.length, p50, p95, failures };
  });

  console.log(JSON.stringify({ baseUrl, iterations, results }, null, 2));
}

run().catch((error) => {
  console.error('Perf baseline failed:', error);
  process.exit(1);
});
