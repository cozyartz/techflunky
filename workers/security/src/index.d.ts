export interface Env {
    SECURITY_METRICS: KVNamespace;
    SECURITY_DB: D1Database;
    SECURITY_REPORTS: R2Bucket;
    SECURITY_ANALYTICS: AnalyticsEngineDataset;
    ENVIRONMENT: string;
    SECURITY_VERSION: string;
    LAST_AUDIT: string;
    NEXT_AUDIT: string;
}
declare const _default: {
    fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map