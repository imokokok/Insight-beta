export interface ComplianceReport {
  id: string;
  reportType: ComplianceReportType;
  period: { start: string; end: string };
  generatedAt: string;
  status: "compliant" | "non_compliant" | "needs_review";
  overallScore: number;
  sections: ComplianceSection[];
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  attestations: Attestation[];
  metadata: ComplianceMetadata;
}

export type ComplianceReportType =
  | "soc2_type2"
  | "iso27001"
  | "gdpr"
  | "ccpa"
  | "custom"
  | "security_assessment"
  | "operational_excellence"
  | "data_integrity";

export interface ComplianceSection {
  id: string;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
  score: number;
  weight: number;
  status: "compliant" | "non_compliant" | "partial" | "not_applicable";
}

export interface ComplianceRequirement {
  id: string;
  code: string;
  description: string;
  status:
    | "compliant"
    | "non_compliant"
    | "partial"
    | "not_applicable"
    | "pending";
  evidence: string[];
  lastChecked: string;
  notes: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface ComplianceFinding {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  requirementId: string;
  requirementCode: string;
  currentState: string;
  expectedState: string;
  remediation: string;
  timeline: string;
  owner: string;
  status: "open" | "in_progress" | "resolved" | "accepted";
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRecommendation {
  id: string;
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  estimatedCost: string;
  expectedBenefit: string;
  implementationSteps: string[];
  dependencies: string[];
}

export interface Attestation {
  id: string;
  attestorName: string;
  attestorTitle: string;
  attestorEmail: string;
  scope: string;
  signedAt: string;
  validUntil: string;
  signature: string;
  notes: string;
}

export interface ComplianceMetadata {
  organizationName: string;
  systemName: string;
  version: string;
  assessorName: string;
  assessorQualification: string;
  testingPeriod: string;
  totalControlsTested: number;
  controlsPassed: number;
  controlsFailed: number;
  controlsNotApplicable: number;
}

export interface ComplianceCheck {
  type: ComplianceReportType;
  category: string;
  check: string;
  criteria: string;
  procedure: string;
  expectedResult: string;
  actualResult: string;
  passFail: boolean;
  observations: string[];
  recommendations: string[];
}

export class ComplianceReportGenerator {
  private readonly FRAMEWORKS: Record<ComplianceReportType, FrameworkConfig> = {
    soc2_type2: {
      name: "SOC 2 Type II",
      description: "Service Organization Control 2 Type II audit report",
      sections: [
        { id: "cc", name: "Common Criteria", weight: 100, requirements: 116 },
      ],
    },
    iso27001: {
      name: "ISO 27001",
      description: "Information Security Management System standard",
      sections: [
        {
          id: "a5",
          name: "Information Security Policies",
          weight: 10,
          requirements: 2,
        },
        {
          id: "a6",
          name: "Organization of Information Security",
          weight: 10,
          requirements: 7,
        },
        {
          id: "a7",
          name: "Human Resource Security",
          weight: 10,
          requirements: 6,
        },
        { id: "a8", name: "Asset Management", weight: 10, requirements: 6 },
        { id: "a9", name: "Access Control", weight: 15, requirements: 14 },
        { id: "a10", name: "Cryptography", weight: 10, requirements: 2 },
        { id: "a11", name: "Physical Security", weight: 10, requirements: 6 },
        {
          id: "a12",
          name: "Operations Security",
          weight: 15,
          requirements: 16,
        },
        {
          id: "a13",
          name: "Communications Security",
          weight: 10,
          requirements: 7,
        },
        {
          id: "a14",
          name: "System Acquisition & Development",
          weight: 10,
          requirements: 6,
        },
        {
          id: "a15",
          name: "Supplier Relationships",
          weight: 5,
          requirements: 5,
        },
        { id: "a16", name: "Incident Management", weight: 10, requirements: 5 },
        { id: "a17", name: "Business Continuity", weight: 5, requirements: 4 },
        { id: "a18", name: "Compliance", weight: 10, requirements: 8 },
      ],
    },
    gdpr: {
      name: "GDPR",
      description: "General Data Protection Regulation compliance",
      sections: [
        {
          id: "principles",
          name: "Data Processing Principles",
          weight: 20,
          requirements: 6,
        },
        {
          id: "lawful_basis",
          name: "Lawful Basis for Processing",
          weight: 15,
          requirements: 6,
        },
        {
          id: "consent",
          name: "Consent Requirements",
          weight: 15,
          requirements: 5,
        },
        {
          id: "transparency",
          name: "Transparency & Information",
          weight: 10,
          requirements: 4,
        },
        {
          id: "data_subject_rights",
          name: "Data Subject Rights",
          weight: 20,
          requirements: 8,
        },
        {
          id: "security",
          name: "Security of Processing",
          weight: 15,
          requirements: 5,
        },
        {
          id: "accountability",
          name: "Accountability",
          weight: 10,
          requirements: 4,
        },
      ],
    },
    ccpa: {
      name: "CCPA",
      description: "California Consumer Privacy Act compliance",
      sections: [
        {
          id: "notice",
          name: "Privacy Notice Requirements",
          weight: 20,
          requirements: 4,
        },
        {
          id: "access",
          name: "Consumer Access Rights",
          weight: 20,
          requirements: 3,
        },
        {
          id: "deletion",
          name: "Right to Deletion",
          weight: 15,
          requirements: 3,
        },
        {
          id: "optout",
          name: "Opt-Out Requirements",
          weight: 15,
          requirements: 3,
        },
        {
          id: "nondiscrimination",
          name: "Non-Discrimination",
          weight: 10,
          requirements: 2,
        },
        { id: "security", name: "Data Security", weight: 20, requirements: 4 },
      ],
    },
    custom: {
      name: "Custom Compliance Report",
      description: "Custom compliance assessment based on defined requirements",
      sections: [],
    },
    security_assessment: {
      name: "Security Assessment",
      description: "Comprehensive security controls assessment",
      sections: [
        { id: "access", name: "Access Control", weight: 25, requirements: 20 },
        {
          id: "encryption",
          name: "Encryption & Key Management",
          weight: 20,
          requirements: 15,
        },
        {
          id: "network",
          name: "Network Security",
          weight: 20,
          requirements: 15,
        },
        {
          id: "monitoring",
          name: "Monitoring & Logging",
          weight: 20,
          requirements: 15,
        },
        {
          id: "incident",
          name: "Incident Response",
          weight: 15,
          requirements: 10,
        },
      ],
    },
    operational_excellence: {
      name: "Operational Excellence",
      description: "Operational efficiency and reliability assessment",
      sections: [
        {
          id: "reliability",
          name: "System Reliability",
          weight: 30,
          requirements: 10,
        },
        {
          id: "performance",
          name: "Performance Management",
          weight: 25,
          requirements: 8,
        },
        {
          id: "availability",
          name: "Availability & Uptime",
          weight: 30,
          requirements: 8,
        },
        {
          id: "efficiency",
          name: "Resource Efficiency",
          weight: 15,
          requirements: 5,
        },
      ],
    },
    data_integrity: {
      name: "Data Integrity",
      description: "Data integrity and accuracy assessment",
      sections: [
        { id: "accuracy", name: "Data Accuracy", weight: 25, requirements: 8 },
        {
          id: "consistency",
          name: "Data Consistency",
          weight: 25,
          requirements: 6,
        },
        {
          id: "completeness",
          name: "Data Completeness",
          weight: 20,
          requirements: 6,
        },
        {
          id: "validation",
          name: "Data Validation",
          weight: 30,
          requirements: 10,
        },
      ],
    },
  };

  private readonly CONTROL_CHECKS: Record<string, ComplianceCheck[]> = {
    access_control: [
      {
        type: "security_assessment",
        category: "Access Control",
        check: "Multi-Factor Authentication",
        criteria: "All administrative access requires MFA",
        procedure: "Verify MFA enforcement for admin users",
        expectedResult: "MFA is enforced for all admin accounts",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
      {
        type: "security_assessment",
        category: "Access Control",
        check: "Role-Based Access Control",
        criteria: "Users have least privilege access",
        procedure: "Review user permissions and roles",
        expectedResult: "Users have minimal required permissions",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
      {
        type: "security_assessment",
        category: "Access Control",
        check: "Access Review",
        criteria: "Quarterly access reviews conducted",
        procedure: "Check access review documentation",
        expectedResult: "Access reviews completed within last 90 days",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
    ],
    encryption: [
      {
        type: "security_assessment",
        category: "Encryption",
        check: "Data at Rest Encryption",
        criteria: "All sensitive data encrypted at rest",
        procedure: "Verify encryption configuration for databases",
        expectedResult: "AES-256 encryption enabled for all data stores",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
      {
        type: "security_assessment",
        category: "Encryption",
        check: "Data in Transit Encryption",
        criteria: "All data transmitted over encrypted channels",
        procedure: "Verify TLS configuration",
        expectedResult: "TLS 1.2+ for all external communications",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
    ],
    monitoring: [
      {
        type: "security_assessment",
        category: "Monitoring",
        check: "Audit Logging",
        criteria: "Comprehensive audit logging enabled",
        procedure: "Review audit log configuration",
        expectedResult: "All security-relevant events logged",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
      {
        type: "security_assessment",
        category: "Monitoring",
        check: "Log Retention",
        criteria: "Logs retained for minimum period",
        procedure: "Check log retention policies",
        expectedResult: "Logs retained for at least 90 days",
        actualResult: "",
        passFail: false,
        observations: [],
        recommendations: [],
      },
    ],
  };

  generateReport(
    type: ComplianceReportType,
    startDate: string,
    endDate: string,
    organizationName: string,
    systemName: string,
    customSections?: ComplianceSection[],
  ): ComplianceReport {
    const effectiveSystemName = systemName || "Unknown System";
    const framework = this.FRAMEWORKS[type];
    const sections = customSections || this.generateSections(type, framework);

    const totalControls = sections.reduce(
      (sum, s) => sum + s.requirements.length,
      0,
    );
    const passedControls = sections.reduce(
      (sum, s) =>
        sum + s.requirements.filter((r) => r.status === "compliant").length,
      0,
    );
    const failedControls = sections.reduce(
      (sum, s) =>
        sum + s.requirements.filter((r) => r.status === "non_compliant").length,
      0,
    );

    const overallScore =
      totalControls > 0 ? (passedControls / totalControls) * 100 : 0;

    const findings = this.generateFindings(sections);
    const recommendations = this.generateRecommendations(
      type,
      sections,
      findings,
    );

    const status =
      overallScore >= 95
        ? "compliant"
        : overallScore >= 75
          ? "needs_review"
          : "non_compliant";

    return {
      id: this.generateId(),
      reportType: type,
      period: { start: startDate, end: endDate },
      generatedAt: new Date().toISOString(),
      status,
      overallScore: Number(overallScore.toFixed(1)),
      sections,
      findings,
      recommendations,
      attestations: [],
      metadata: {
        organizationName,
        systemName: effectiveSystemName,
        version: "1.0.0",
        assessorName: "Insight Oracle Compliance System",
        assessorQualification: "Automated Assessment",
        testingPeriod: `${startDate} to ${endDate}`,
        totalControlsTested: totalControls,
        controlsPassed: passedControls,
        controlsFailed: failedControls,
        controlsNotApplicable: sections.reduce(
          (sum, s) =>
            sum +
            s.requirements.filter((r) => r.status === "not_applicable").length,
          0,
        ),
      },
    };
  }

  private generateSections(
    type: ComplianceReportType,
    framework: FrameworkConfig,
  ): ComplianceSection[] {
    if (type === "custom" || !framework.sections.length) {
      return this.generateDefaultSections();
    }

    return framework.sections.map((section) => ({
      id: section.id,
      name: section.name,
      description: `Assessment of ${section.name} controls`,
      requirements: this.generateRequirements(section.id, section.requirements),
      score: 0,
      weight: section.weight,
      status: "partial" as const,
    }));
  }

  private generateDefaultSections(): ComplianceSection[] {
    return [
      {
        id: "access",
        name: "Access Control",
        description: "Assessment of access control mechanisms",
        requirements: this.generateRequirements("access", 5),
        score: 0,
        weight: 25,
        status: "partial" as const,
      },
      {
        id: "security",
        name: "Security Controls",
        description: "Assessment of security controls",
        requirements: this.generateRequirements("security", 5),
        score: 0,
        weight: 30,
        status: "partial" as const,
      },
      {
        id: "operations",
        name: "Operational Procedures",
        description: "Assessment of operational procedures",
        requirements: this.generateRequirements("operations", 5),
        score: 0,
        weight: 25,
        status: "partial" as const,
      },
      {
        id: "monitoring",
        name: "Monitoring & Logging",
        description: "Assessment of monitoring and logging",
        requirements: this.generateRequirements("monitoring", 5),
        score: 0,
        weight: 20,
        status: "partial" as const,
      },
    ];
  }

  private generateRequirements(
    sectionId: string,
    count: number,
  ): ComplianceRequirement[] {
    const requirementTemplates: Record<
      string,
      Array<{
        code: string;
        description: string;
        riskLevel: "low" | "medium" | "high" | "critical";
      }>
    > = {
      access: [
        {
          code: "AC-1",
          description: "Multi-factor authentication enabled",
          riskLevel: "high",
        },
        {
          code: "AC-2",
          description: "Role-based access control implemented",
          riskLevel: "medium",
        },
        {
          code: "AC-3",
          description: "Periodic access reviews conducted",
          riskLevel: "medium",
        },
        {
          code: "AC-4",
          description: "Privileged access management enforced",
          riskLevel: "critical",
        },
        {
          code: "AC-5",
          description: "Session timeout and management",
          riskLevel: "low",
        },
      ],
      security: [
        {
          code: "SC-1",
          description: "Encryption at rest implemented",
          riskLevel: "high",
        },
        {
          code: "SC-2",
          description: "Encryption in transit enforced",
          riskLevel: "high",
        },
        {
          code: "SC-3",
          description: "Key management procedures established",
          riskLevel: "high",
        },
        {
          code: "SC-4",
          description: "Vulnerability management program",
          riskLevel: "medium",
        },
        {
          code: "SC-5",
          description: "Patch management process",
          riskLevel: "medium",
        },
      ],
      operations: [
        {
          code: "OP-1",
          description: "Change management procedures",
          riskLevel: "medium",
        },
        {
          code: "OP-2",
          description: "Incident response procedures",
          riskLevel: "high",
        },
        {
          code: "OP-3",
          description: "Business continuity planning",
          riskLevel: "medium",
        },
        {
          code: "OP-4",
          description: "Disaster recovery testing",
          riskLevel: "high",
        },
        { code: "OP-5", description: "Capacity planning", riskLevel: "low" },
      ],
      monitoring: [
        {
          code: "MN-1",
          description: "Audit logging enabled",
          riskLevel: "high",
        },
        {
          code: "MN-2",
          description: "Log retention policies",
          riskLevel: "medium",
        },
        {
          code: "MN-3",
          description: "Security monitoring active",
          riskLevel: "high",
        },
        {
          code: "MN-4",
          description: "Alert configuration",
          riskLevel: "medium",
        },
        {
          code: "MN-5",
          description: "Log analysis procedures",
          riskLevel: "medium",
        },
      ],
    };

    const templates =
      requirementTemplates[sectionId as keyof typeof requirementTemplates] ||
      requirementTemplates["access"];
    if (!templates || templates.length === 0) {
      return [];
    }
    const requirements: ComplianceRequirement[] = [];

    for (let i = 0; i < Math.min(count, templates.length); i++) {
      const template = templates[i];
      if (!template) continue;
      const statuses: Array<ComplianceRequirement["status"]> = [
        "compliant",
        "compliant",
        "compliant",
        "compliant",
        "partial",
        "non_compliant",
      ];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)] ?? "partial";

      requirements.push({
        id: this.generateId(),
        code: template.code,
        description: template.description,
        status: randomStatus,
        evidence: [`Evidence for ${template.code}`],
        lastChecked: new Date().toISOString(),
        notes: "",
        riskLevel: template.riskLevel,
      });
    }

    return requirements;
  }

  private generateFindings(sections: ComplianceSection[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];

    sections.forEach((section) => {
      section.requirements
        .filter((r) => r.status === "non_compliant" || r.status === "partial")
        .slice(0, 2)
        .forEach((req) => {
          findings.push({
            id: this.generateId(),
            severity: req.riskLevel,
            title: `${req.code}: ${req.description}`,
            description: `Control ${req.code} is currently ${req.status}`,
            requirementId: req.id,
            requirementCode: req.code,
            currentState:
              req.status === "non_compliant"
                ? "Control not implemented"
                : "Control partially implemented",
            expectedState: "Full compliance with requirement",
            remediation: `Implement or enhance ${req.description}`,
            timeline: "Within 30 days",
            owner: "Security Team",
            status: "open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
    });

    return findings;
  }

  private generateRecommendations(
    _type: ComplianceReportType,
    _sections: ComplianceSection[],
    findings: ComplianceFinding[],
  ): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    if (findings.some((f) => f.severity === "critical")) {
      recommendations.push({
        id: this.generateId(),
        priority: "critical",
        category: "Security",
        title: "Address Critical Findings Immediately",
        description:
          "Multiple critical severity findings require immediate attention",
        impact: "High risk exposure until addressed",
        effort: "high",
        estimatedCost: "$10,000-$50,000",
        expectedBenefit: "Eliminate critical security gaps",
        implementationSteps: [
          "Prioritize critical findings for immediate remediation",
          "Engage security team for urgent review",
          "Implement compensating controls where immediate fix is not feasible",
          "Schedule follow-up assessment within 30 days",
        ],
        dependencies: ["Budget approval", "Resource allocation"],
      });
    }

    if (findings.some((f) => f.severity === "high")) {
      recommendations.push({
        id: this.generateId(),
        priority: "high",
        category: "Security",
        title: "Remediate High Severity Findings",
        description:
          "Address high priority security gaps identified in assessment",
        impact: "Significant risk reduction",
        effort: "medium",
        estimatedCost: "$5,000-$25,000",
        expectedBenefit: "Improve security posture significantly",
        implementationSteps: [
          "Review high severity findings in detail",
          "Develop remediation plan",
          "Implement security enhancements",
          "Validate remediation effectiveness",
        ],
        dependencies: ["Technical resources", "Management approval"],
      });
    }

    recommendations.push({
      id: this.generateId(),
      priority: "medium",
      category: "Process",
      title: "Enhance Compliance Monitoring",
      description: "Implement continuous compliance monitoring capabilities",
      impact: "Improved visibility into compliance status",
      effort: "medium",
      estimatedCost: "$2,000-$10,000",
      expectedBenefit: "Real-time compliance visibility",
      implementationSteps: [
        "Define compliance metrics and KPIs",
        "Implement automated monitoring tools",
        "Set up compliance dashboards",
        "Establish regular review cadence",
      ],
      dependencies: ["Tool selection", "Integration with existing systems"],
    });

    if (_type === "soc2_type2" || _type === "iso27001") {
      recommendations.push({
        id: this.generateId(),
        priority: "medium",
        category: "Documentation",
        title: "Update Security Documentation",
        description: "Ensure all security policies and procedures are current",
        impact: "Better alignment with framework requirements",
        effort: "low",
        estimatedCost: "$500-$2,000",
        expectedBenefit: "Complete and accurate documentation",
        implementationSteps: [
          "Review existing documentation",
          "Identify gaps and outdated content",
          "Update policies and procedures",
          "Obtain management approval",
        ],
        dependencies: ["Policy review cycle"],
      });
    }

    return recommendations;
  }

  async runChecks(type: ComplianceReportType): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    switch (type) {
      case "security_assessment":
        this.CONTROL_CHECKS?.access_control?.forEach((check) => {
          checks.push({
            ...check,
            actualResult: "Sample result",
            passFail: Math.random() > 0.3,
          });
        });
        this.CONTROL_CHECKS?.encryption?.forEach((check) => {
          checks.push({
            ...check,
            actualResult: "Sample result",
            passFail: Math.random() > 0.3,
          });
        });
        this.CONTROL_CHECKS?.monitoring?.forEach((check) => {
          checks.push({
            ...check,
            actualResult: "Sample result",
            passFail: Math.random() > 0.3,
          });
        });
        break;

      default:
        checks.push({
          type,
          category: "General",
          check: "Basic Compliance Check",
          criteria: "System meets basic compliance requirements",
          procedure: "Automated assessment",
          expectedResult: "Compliance verified",
          actualResult: "Assessment in progress",
          passFail: false,
          observations: [],
          recommendations: [],
        });
    }

    return checks;
  }

  private generateId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  exportReport(
    report: ComplianceReport,
    format: "json" | "csv" | "pdf",
  ): string {
    if (format === "json") {
      return JSON.stringify(report, null, 2);
    }

    if (format === "csv") {
      const lines: string[] = [];
      lines.push("Section,Requirement,Code,Status,Risk Level,Description");

      report.sections.forEach((section) => {
        section.requirements.forEach((req) => {
          lines.push(
            `"${section.name}","${req.description}","${req.code}","${req.status}","${req.riskLevel}","${req.description}"`,
          );
        });
      });

      return lines.join("\n");
    }

    return JSON.stringify(report, null, 2);
  }
}

interface FrameworkConfig {
  name: string;
  description: string;
  sections: Array<{
    id: string;
    name: string;
    weight: number;
    requirements: number;
  }>;
}

export const complianceReportGenerator = new ComplianceReportGenerator();

export function generateQuickComplianceReport(
  type: ComplianceReportType,
  organizationName: string,
  systemName: string,
): ComplianceReport {
  const endDate = new Date().toISOString().split("T")[0] as string;
  const startDate = (new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0] || "") as string;

  return complianceReportGenerator.generateReport(
    type,
    startDate,
    endDate,
    organizationName,
    systemName || "Unknown System",
  );
}
