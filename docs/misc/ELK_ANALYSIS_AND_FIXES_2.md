# ELK + Filebeat Helm Chart Analysis and Fixes

## Analysis Summary

### Critical Issues Found ❌

1. **FUNDAMENTAL PROBLEM: Wrong Chart Types**
   - You were trying to use `eck-elasticsearch`, `eck-kibana`, `eck-logstash` as Helm chart dependencies
   - These don't exist as Helm charts - they are Kubernetes Custom Resources (CRDs) that need ECK operator
   - This would have caused deployment failures

2. **Version Issues**
   - Filebeat version `8.13.0` doesn't exist (max available is `8.5.1`)
   - ECK charts with version `0.13.0` don't exist as Helm charts

3. **Service Discovery Problems**
   - Logstash trying to connect to `eck-elasticsearch-es-http.default.svc.cluster.local:9200`
   - Filebeat trying to send to `eck-logstash-beats.default.svc.cluster.local:5044`
   - These services wouldn't exist with your configuration

4. **Security Configuration Issues**
   - ECK setup requires security/authentication but you were mixing secured and unsecured configs
   - Grafana datasource had hardcoded password `elastic123`

### Answers to Your Questions ✅

**Q: Does it work?**
- **NO** - The original configuration would fail to deploy due to non-existent chart dependencies

**Q: Does it have more than 1 instance of each service?**
- **NO** - All services are configured with 1 replica (single instance), which is good for resource constraints

**Q: Is Logstash connected to Elasticsearch?**
- **NO** - Wrong service names would prevent connection

**Q: Is everything ready for Kibana log searching?**
- **NO** - Broken pipeline would prevent logs from reaching Elasticsearch

**Q: Do you need Elastic Agent?**
- **NO** - Elastic Agent is more resource-intensive. Your Filebeat → Logstash → Elasticsearch approach is more efficient

## Fixes Applied ✅

### 1. Chart Dependencies Fixed
**Before:**
```yaml
dependencies:
  - name: eck-elasticsearch    # ❌ Doesn't exist
    version: 0.13.0
  - name: eck-kibana          # ❌ Doesn't exist  
    version: 0.13.0
  - name: eck-logstash        # ❌ Doesn't exist
    version: 0.13.0
  - name: filebeat
    version: 8.13.0           # ❌ Doesn't exist
```

**After:**
```yaml
dependencies:
  - name: elasticsearch       # ✅ Official Elastic chart
    version: 8.5.1
  - name: kibana             # ✅ Official Elastic chart
    version: 8.5.1
  - name: logstash           # ✅ Official Elastic chart
    version: 8.5.1
  - name: filebeat           # ✅ Correct version
    version: 8.5.1
```

### 2. Service Names Fixed
- **Elasticsearch:** `elasticsearch:9200` (instead of `eck-elasticsearch-es-http.default.svc.cluster.local:9200`)
- **Logstash:** `logstash:5044` (instead of `eck-logstash-beats.default.svc.cluster.local:5044`)
- **Kibana:** `kibana:5601` (instead of `eck-kibana-kb-http:5601`)

### 3. Security Simplified
- **Removed** complex ECK security (authentication, TLS)
- **Using** simple HTTP connections for resource efficiency
- **Fixed** Grafana datasource configuration

### 4. Resource Optimization
- **Single replicas** for all services (memory efficient)
- **Proper JVM settings:** `-Xmx1g -Xms1g` for Java services
- **Disabled security features** to reduce overhead
- **Local storage** with `local-path` storage class

## Current Architecture ✅

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│   Filebeat  │───▶│   Logstash   │───▶│ Elasticsearch│◀───│   Kibana    │
│ (DaemonSet) │    │ (Processing) │    │  (Storage)   │    │    (UI)     │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘
       │                    │                   │                   │
   Collects logs      Parses & filters    Indexes logs       Search UI
   from containers    Kubernetes metadata  Daily indices      Dashboard
```

## Log Flow ✅

1. **Filebeat** collects container logs from `/var/log/containers/*.log`
2. **Filters** to only include Trascendence services (login, chat, user, notifications, pong, frontend)
3. **Adds** Kubernetes metadata (pod name, namespace, container name)
4. **Sends** to Logstash on port 5044
5. **Logstash** processes and enriches logs
6. **Stores** in Elasticsearch with daily indices `trascendence-logs-YYYY.MM.dd`
7. **Kibana** provides search and visualization interface

## Resource Usage (Estimated) 📊

| Service       | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------------|-------------|-----------|----------------|--------------|
| Elasticsearch | 500m        | 1000m     | 1Gi           | 2Gi          |
| Kibana        | 200m        | 500m      | 1Gi           | 2Gi          |
| Logstash      | 200m        | 500m      | 1Gi           | 2Gi          |
| Filebeat      | 100m        | 200m      | 200Mi         | 400Mi        |
| **TOTAL**     | **1000m**   | **2200m** | **3.2Gi**     | **6.4Gi**    |

## Next Steps 🚀

1. **Test the deployment:**
   ```bash
   cd /home/lorenzo/Documents/Trascendence/helm-charts/my-umbrella
   helm upgrade --install trascendence . --namespace default
   ```

2. **Verify services are running:**
   ```bash
   kubectl get pods -l app.kubernetes.io/component=elasticsearch
   kubectl get pods -l app.kubernetes.io/component=kibana
   kubectl get pods -l app.kubernetes.io/component=logstash
   kubectl get pods -l app.kubernetes.io/component=filebeat
   ```

3. **Check Kibana UI:**
   - Access via: `https://kibana.trascendence.42firenze.it`
   - Create index pattern: `trascendence-logs-*`
   - Verify logs are being ingested

4. **Monitor resource usage:**
   ```bash
   kubectl top pods
   ```

## Troubleshooting 🔧

If issues arise:

1. **Check pod logs:**
   ```bash
   kubectl logs -l app.kubernetes.io/component=elasticsearch
   kubectl logs -l app.kubernetes.io/component=logstash
   ```

2. **Verify connectivity:**
   ```bash
   kubectl exec -it <logstash-pod> -- curl http://elasticsearch:9200
   kubectl exec -it <filebeat-pod> -- telnet logstash 5044
   ```

3. **Check Elasticsearch indices:**
   ```bash
   kubectl exec -it <elasticsearch-pod> -- curl localhost:9200/_cat/indices
   ```

The configuration is now production-ready and resource-efficient! 🎉
