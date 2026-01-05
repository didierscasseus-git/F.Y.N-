/**
 * 86 ANALYTICS SERVICE
 * 
 * BigQuery-based analytics for 86 event patterns and metrics.
 * Manager/Admin only - does not affect staff scoring.
 * PRD Section 11 - Analytics
 */

import { query } from '../../core/connectors/postgres';
import { createBatchWriter } from '../../core/connectors/bigquery';
import { createLogger } from '../../core/logger';

const logger = createLogger('86_ANALYTICS');

export interface EightySixMetrics {
  totalEvents: number;
  activeEvents: number;
  averageDurationMinutes: number;
  averageTimeToConfirmMinutes: number;
  confirmRatio: number; // confirms / (confirms + rejects)
  topEightySixedItems: Array<{
    menuItemId: string;
    menuItemName: string;
    eventCount: number;
  }>;
  inventoryAccuracy: number; // % of suggestions that were confirmed
  emergencyFrequency: number; // events per week
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get 86 metrics for date range
 */
export async function get86Metrics(range: DateRange): Promise<EightySixMetrics> {
  logger.info('Calculating 86 metrics', {
    startDate: range.startDate.toISOString(),
    endDate: range.endDate.toISOString()
  });

  // Total events in range
  const totalResult = await query(`
    SELECT COUNT(*) as count
    FROM eighty_six_events
    WHERE started_at >= $1 AND started_at <= $2
  `, [range.startDate, range.endDate]);

  const totalEvents = parseInt(totalResult.rows[0].count, 10);

  // Active events
  const activeResult = await query(`
    SELECT COUNT(*) as count
    FROM eighty_six_events
    WHERE resolved_at IS NULL
  `);

  const activeEvents = parseInt(activeResult.rows[0].count, 10);

  // Average duration (resolved events only)
  const durationResult = await query(`
    SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - started_at)) / 60) as avg_minutes
    FROM eighty_six_events
    WHERE started_at >= $1 AND started_at <= $2 AND resolved_at IS NOT NULL
  `, [range.startDate, range.endDate]);

  const averageDurationMinutes = parseFloat(durationResult.rows[0].avg_minutes || '0');

  // Average time to confirm suggestion
  const confirmTimeResult = await query(`
    SELECT AVG(EXTRACT(EPOCH FROM (confirmed_at - suggested_at)) / 60) as avg_minutes
    FROM eighty_six_suggestions
    WHERE suggested_at >= $1 AND suggested_at <= $2 AND confirmed_at IS NOT NULL
  `, [range.startDate, range.endDate]);

  const averageTimeToConfirmMinutes = parseFloat(confirmTimeResult.rows[0].avg_minutes || '0');

  // Confirm ratio
  const ratioResult = await query(`
    SELECT 
      COUNT(CASE WHEN confirmed_at IS NOT NULL THEN 1 END) as confirms,
      COUNT(CASE WHEN rejected = TRUE THEN 1 END) as rejects
    FROM eighty_six_suggestions
    WHERE suggested_at >= $1 AND suggested_at <= $2
  `, [range.startDate, range.endDate]);

  const confirms = parseInt(ratioResult.rows[0].confirms, 10);
  const rejects = parseInt(ratioResult.rows[0].rejects, 10);
  const confirmRatio = (confirms + rejects) > 0 ? confirms / (confirms + rejects) : 0;

  // Top 86'd items
  const topItemsResult = await query(`
    SELECT 
      menu_item_id,
      menu_item_name,
      COUNT(*) as event_count
    FROM eighty_six_events
    WHERE started_at >= $1 AND started_at <= $2
    GROUP BY menu_item_id, menu_item_name
    ORDER BY event_count DESC
    LIMIT 10
  `, [range.startDate, range.endDate]);

  const topEightySixedItems = topItemsResult.rows.map(row => ({
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name,
    eventCount: parseInt(row.event_count, 10)
  }));

  // Inventory accuracy (% of suggestions confirmed)
  const inventoryAccuracy = confirmRatio * 100;

  // Emergency frequency (events per week)
  const daysInRange = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const weeksInRange = daysInRange / 7;
  const emergencyFrequency = weeksInRange > 0 ? totalEvents / weeksInRange : 0;

  const metrics: EightySixMetrics = {
    totalEvents,
    activeEvents,
    averageDurationMinutes: Math.round(averageDurationMinutes * 100) / 100,
    averageTimeToConfirmMinutes: Math.round(averageTimeToConfirmMinutes * 100) / 100,
    confirmRatio: Math.round(confirmRatio * 100) / 100,
    topEightySixedItems,
    inventoryAccuracy: Math.round(inventoryAccuracy * 100) / 100,
    emergencyFrequency: Math.round(emergencyFrequency * 100) / 100
  };

  // Export to BigQuery for aggregation
  await exportMetricsToBigQuery(metrics, range);

  logger.info('86 metrics calculated', metrics);

  return metrics;
}

/**
 * Export metrics to BigQuery
 */
async function exportMetricsToBigQuery(
  metrics: EightySixMetrics,
  range: DateRange
): Promise<void> {
  try {
    const bqWriter = createBatchWriter('eighty_six_analytics');

    await bqWriter.insert([{
      timestamp: new Date().toISOString(),
      period_start: range.startDate.toISOString(),
      period_end: range.endDate.toISOString(),
      total_events: metrics.totalEvents,
      active_events: metrics.activeEvents,
      avg_duration_minutes: metrics.averageDurationMinutes,
      avg_time_to_confirm_minutes: metrics.averageTimeToConfirmMinutes,
      confirm_ratio: metrics.confirmRatio,
      inventory_accuracy: metrics.inventoryAccuracy,
      emergency_frequency: metrics.emergencyFrequency,
      top_items: JSON.stringify(metrics.topEightySixedItems)
    }]);

    logger.info('Metrics exported to BigQuery');
  } catch (err) {
    logger.error('Failed to export to Big Query', err as Error);
    // Don't throw - metrics still returned to user
  }
}

/**
 * Get 86 event history
 */
export async function get86EventHistory(
  range: DateRange,
  limit: number = 50
): Promise<any[]> {
  const result = await query(`
    SELECT 
      e.*,
      EXTRACT(EPOCH FROM (e.resolved_at - e.started_at)) / 60 as duration_minutes
    FROM eighty_six_events e
    WHERE e.started_at >= $1 AND e.started_at <= $2
    ORDER BY e.started_at DESC
    LIMIT $3
  `, [range.startDate, range.endDate, limit]);

  return result.rows.map(row => ({
    id: row.id,
    menuItemId: row.menu_item_id,
    reason: row.reason,
    startedAt: new Date(row.started_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    durationMinutes: parseFloat(row.duration_minutes || '0'),
    createdBy: row.created_by
  }));
}

/**
 * Get suggestion performance metrics
 */
export async function getSuggestionPerformance(range: DateRange): Promise<{
  totalSuggestions: number;
  confirmed: number;
  rejected: number;
  pending: number;
  accuracy: number;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN confirmed_at IS NOT NULL THEN 1 END) as confirmed,
      COUNT(CASE WHEN rejected = TRUE THEN 1 END) as rejected,
      COUNT(CASE WHEN confirmed_at IS NULL AND rejected = FALSE THEN 1 END) as pending
    FROM eighty_six_suggestions
    WHERE suggested_at >= $1 AND suggested_at <= $2
  `, [range.startDate, range.endDate]);

  const row = result.rows[0];
  const total = parseInt(row.total, 10);
  const confirmed = parseInt(row.confirmed, 10);
  const rejected = parseInt(row.rejected, 10);
  const pending = parseInt(row.pending, 10);
  const accuracy = total > 0 ? (confirmed / total) * 100 : 0;

  return {
    totalSuggestions: total,
    confirmed,
    rejected,
    pending,
    accuracy: Math.round(accuracy * 100) / 100
  };
}
