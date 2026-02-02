import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const protocol = searchParams.get('protocol');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');

    const supabase = createSupabaseClient();

    let query = supabase
      .from('manipulation_detections')
      .select('*')
      .order('detected_at', { ascending: false });

    if (startDate) query = query.gte('detected_at', startDate);
    if (endDate) query = query.lte('detected_at', endDate);
    if (protocol) query = query.eq('protocol', protocol);
    if (severity) query = query.eq('severity', severity);
    if (type) query = query.eq('type', type);

    const { data: detections, error } = await query;

    if (error) {
      logger.error('Failed to fetch detections for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch detections' },
        { status: 500 }
      );
    }

    const typeLabels: Record<string, string> = {
      flash_loan_attack: '闪电贷攻击',
      price_manipulation: '价格操纵',
      oracle_manipulation: '预言机操纵',
      sandwich_attack: '三明治攻击',
      front_running: '抢先交易',
      back_running: '尾随交易',
      liquidity_manipulation: '流动性操纵',
      statistical_anomaly: '统计异常',
    };

    const severityLabels: Record<string, string> = {
      critical: '严重',
      high: '高危',
      medium: '中危',
      low: '低危',
    };

    const statusLabels: Record<string, string> = {
      pending: '待审核',
      confirmed: '已确认',
      false_positive: '误报',
      under_investigation: '调查中',
    };

    if (format === 'csv') {
      const headers = [
        'ID',
        '检测时间',
        '协议',
        '交易对',
        '链',
        '检测类型',
        '严重程度',
        '置信度',
        '价格影响(%)',
        '资金影响(USD)',
        '状态',
        '审核人',
        '审核时间',
        '备注',
      ];

      const rows = detections?.map((d) => [
        d.id,
        new Date(d.detected_at).toLocaleString('zh-CN'),
        d.protocol,
        d.symbol,
        d.chain,
        typeLabels[d.type] || d.type,
        severityLabels[d.severity] || d.severity,
        `${(d.confidence_score * 100).toFixed(2)}%`,
        d.price_impact ? d.price_impact.toFixed(4) : 'N/A',
        d.financial_impact_usd ? d.financial_impact_usd.toString() : 'N/A',
        statusLabels[d.status] || d.status,
        d.reviewed_by || 'N/A',
        d.reviewed_at ? new Date(d.reviewed_at).toLocaleString('zh-CN') : 'N/A',
        d.notes || 'N/A',
      ]);

      const csvContent = [headers.join(','), ...rows!.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="manipulation-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'json') {
      const report = {
        generatedAt: new Date().toISOString(),
        filters: {
          startDate,
          endDate,
          protocol,
          severity,
          type,
        },
        summary: {
          totalDetections: detections?.length || 0,
          bySeverity: {} as Record<string, number>,
          byType: {} as Record<string, number>,
          byProtocol: {} as Record<string, number>,
        },
        detections: detections?.map((d) => ({
          id: d.id,
          detectedAt: d.detected_at,
          protocol: d.protocol,
          symbol: d.symbol,
          chain: d.chain,
          type: d.type,
          typeLabel: typeLabels[d.type] || d.type,
          severity: d.severity,
          severityLabel: severityLabels[d.severity] || d.severity,
          confidenceScore: d.confidence_score,
          priceImpact: d.price_impact,
          financialImpactUsd: d.financial_impact_usd,
          status: d.status,
          statusLabel: statusLabels[d.status] || d.status,
          evidence: d.evidence,
          suspiciousTransactions: d.suspicious_transactions,
          reviewedBy: d.reviewed_by,
          reviewedAt: d.reviewed_at,
          notes: d.notes,
        })),
      };

      // Calculate summary statistics
      detections?.forEach((d) => {
        report.summary.bySeverity[d.severity] = (report.summary.bySeverity[d.severity] || 0) + 1;
        report.summary.byType[d.type] = (report.summary.byType[d.type] || 0) + 1;
        report.summary.byProtocol[d.protocol] = (report.summary.byProtocol[d.protocol] || 0) + 1;
      });

      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="manipulation-report-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Unsupported format. Use csv or json' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error in export API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
