import { Pool } from 'pg';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ name: 'audit-service' });

// Audit log schema
const AuditLogSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.date().optional(),
});

export class AuditService {
  constructor(
    private db: Pool,
    private elasticsearch: ElasticsearchClient
  ) {}

  async createIndices() {
    const indexName = 'audit-logs';
    
    const exists = await this.elasticsearch.indices.exists({ index: indexName });
    if (!exists) {
      await this.elasticsearch.indices.create({
        index: indexName,
        body: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 2,
            'index.lifecycle.name': 'audit-policy',
            'index.lifecycle.rollover_alias': 'audit-logs',
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              tenantId: { type: 'keyword' },
              userId: { type: 'keyword' },
              action: { type: 'keyword' },
              resourceType: { type: 'keyword' },
              resourceId: { type: 'keyword' },
              ipAddress: { type: 'ip' },
              userAgent: { type: 'text' },
              requestId: { type: 'keyword' },
              timestamp: { type: 'date' },
              hash: { type: 'keyword' },
              metadata: { type: 'object', enabled: false },
              duration: { type: 'long' },
              statusCode: { type: 'short' },
              errorMessage: { type: 'text' },
            }
          }
        }
      });

      // Create ILM policy for retention
      await this.elasticsearch.ilm.putLifecycle({
        name: 'audit-policy',
        body: {
          policy: {
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_size: '50GB',
                    max_age: '30d',
                  }
                }
              },
              warm: {
                min_age: '30d',
                actions: {
                  shrink: {
                    number_of_shards: 1
                  },
                  forcemerge: {
                    max_num_segments: 1
                  }
                }
              },
              cold: {
                min_age: '90d',
                actions: {
                  searchable_snapshot: {
                    snapshot_repository: 'audit-snapshots'
                  }
                }
              },
              delete: {
                min_age: '2555d', // 7 years
                actions: {
                  delete: {}
                }
              }
            }
          }
        }
      });
    }
  }

  async log(data: z.infer<typeof AuditLogSchema>) {
    const validated = AuditLogSchema.parse(data);
    const id = uuidv4();
    const timestamp = validated.timestamp || new Date();

    // Create tamper-proof hash
    const hashData = JSON.stringify({
      id,
      tenantId: validated.tenantId,
      userId: validated.userId,
      action: validated.action,
      resourceType: validated.resourceType,
      resourceId: validated.resourceId,
      timestamp: timestamp.toISOString(),
    });
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');

    // Write to PostgreSQL (WORM)
    await this.db.query(
      `INSERT INTO audit.logs (
        id, tenant_id, user_id, action, resource_type, resource_id,
        ip_address, user_agent, request_id, metadata, timestamp, hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        validated.tenantId,
        validated.userId,
        validated.action,
        validated.resourceType,
        validated.resourceId,
        validated.ipAddress,
        validated.userAgent,
        validated.requestId,
        JSON.stringify(validated.metadata || {}),
        timestamp,
        hash,
      ]
    );

    // Write to Elasticsearch for search
    await this.elasticsearch.index({
      index: 'audit-logs',
      body: {
        id,
        ...validated,
        timestamp,
        hash,
      }
    });

    logger.info({
      id,
      action: validated.action,
      userId: validated.userId,
      tenantId: validated.tenantId,
    }, 'Audit log created');

    return { id, hash };
  }

  async search(params: {
    tenantId: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const must: any[] = [
      { term: { tenantId: params.tenantId } }
    ];

    if (params.userId) {
      must.push({ term: { userId: params.userId } });
    }
    if (params.action) {
      must.push({ term: { action: params.action } });
    }
    if (params.resourceType) {
      must.push({ term: { resourceType: params.resourceType } });
    }
    if (params.resourceId) {
      must.push({ term: { resourceId: params.resourceId } });
    }
    if (params.startDate || params.endDate) {
      const range: any = {};
      if (params.startDate) range.gte = params.startDate.toISOString();
      if (params.endDate) range.lte = params.endDate.toISOString();
      must.push({ range: { timestamp: range } });
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const from = (page - 1) * pageSize;

    const result = await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: { bool: { must } },
        sort: [{ timestamp: { order: 'desc' } }],
        from,
        size: pageSize,
      }
    });

    return {
      items: result.hits.hits.map(hit => hit._source),
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
      page,
      pageSize,
    };
  }

  async verify(id: string, tenantId: string): Promise<boolean> {
    // Get log from PostgreSQL
    const result = await this.db.query(
      'SELECT * FROM audit.logs WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const log = result.rows[0];

    // Recreate hash
    const hashData = JSON.stringify({
      id: log.id,
      tenantId: log.tenant_id,
      userId: log.user_id,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      timestamp: log.timestamp.toISOString(),
    });
    const expectedHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // Verify hash matches
    return log.hash === expectedHash;
  }

  async export(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
    format: 'json' | 'csv';
  }) {
    const result = await this.db.query(
      `SELECT * FROM audit.logs 
       WHERE tenant_id = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
       ORDER BY timestamp DESC`,
      [params.tenantId, params.startDate, params.endDate]
    );

    if (params.format === 'csv') {
      return this.convertToCSV(result.rows);
    }

    return result.rows;
  }

  async getStatistics(tenantId: string, period: '24h' | '7d' | '30d' | '90d') {
    const periodMap = {
      '24h': 'now-24h',
      '7d': 'now-7d',
      '30d': 'now-30d',
      '90d': 'now-90d',
    };

    const result = await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { tenantId } },
              { range: { timestamp: { gte: periodMap[period] } } }
            ]
          }
        },
        size: 0,
        aggs: {
          actions: {
            terms: { field: 'action', size: 20 }
          },
          users: {
            cardinality: { field: 'userId' }
          },
          timeline: {
            date_histogram: {
              field: 'timestamp',
              calendar_interval: period === '24h' ? '1h' : '1d',
            }
          },
          resourceTypes: {
            terms: { field: 'resourceType', size: 10 }
          }
        }
      }
    });

    return {
      totalEvents: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
      uniqueUsers: result.aggregations?.users?.value || 0,
      topActions: result.aggregations?.actions?.buckets || [],
      timeline: result.aggregations?.timeline?.buckets || [],
      resourceTypes: result.aggregations?.resourceTypes?.buckets || [],
    };
  }

  private convertToCSV(rows: any[]): string {
    if (rows.length === 0) return '';

    const headers = Object.keys(rows[0]).join(',');
    const data = rows.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    ).join('\n');

    return `${headers}\n${data}`;
  }
}